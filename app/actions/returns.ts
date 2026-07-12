"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return { supabase };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function number(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  if (!Number.isFinite(value)) throw new Error(`${key} 必须是数字`);
  return value;
}

function refreshReturns() {
  revalidatePath("/returns/return-notes");
  revalidatePath("/returns/disposition");
  revalidatePath("/returns/adjustments");
  revalidatePath("/delivery/trips");
  revalidatePath("/finance/credit-note-queue");
  revalidatePath("/dashboard");
}

/**
 * 铁律 11：退货必须从原始 SL 建立批次追溯入口，禁止无来源退货。
 * UI 使用 original_sl_id，数据库对应 return_notes.shipping_list_id。
 */
export async function createReturnNote(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const originalSlId = text(formData, "original_sl_id");
  if (!originalSlId) throw new Error("退货必须引用原始发运单 original_sl_id");
  const { data: shipping, error: shippingError } = await supabase
    .from("shipping_lists").select("id, customer_id").eq("id", originalSlId).single();
  if (shippingError || !shipping) throw new Error("原始发运单不存在或无权访问");
  const quarantineLocationId = text(formData, "quarantine_location_id");
  if (!quarantineLocationId) throw new Error("必须选择隔离储位");

  const { data, error } = await supabase.from("return_notes").insert({
    return_number: `RT-${Date.now().toString(36).toUpperCase()}`,
    return_type: text(formData, "return_type") || "post_delivery",
    shipping_list_id: originalSlId,
    customer_id: shipping.customer_id,
    quarantine_location_id: quarantineLocationId,
    responsibility: text(formData, "responsibility") || "under_investigation",
    notes: text(formData, "notes") || null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  refreshReturns();
  redirect(`/returns/return-notes/${data.id}`);
}

/**
 * 铁律 3/11：称重品退货必须同时记录 returned_units 与退回实重，
 * 且退货行必须引用原发运行，禁止用平均重量代填实重。
 */
export async function addReturnLine(returnNoteId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const originalLineId = text(formData, "original_sl_line_id");
  if (!originalLineId) throw new Error("必须选择原发运行");
  const { data: line, error: lineError } = await supabase.from("sl_lines")
    .select("id, product_id, batch_id, is_catch_weight_snapshot, shipping_list_id")
    .eq("id", originalLineId).single();
  if (lineError || !line) throw new Error("原发运行不存在");
  const { data: note } = await supabase.from("return_notes")
    .select("shipping_list_id").eq("id", returnNoteId).single();
  if (!note || note.shipping_list_id !== line.shipping_list_id) {
    throw new Error("退货行不属于退货单引用的原始 SL");
  }
  const returnedUnits = number(formData, "returned_units");
  if (returnedUnits <= 0) throw new Error("退回件数必须大于零");
  const weightText = text(formData, "returned_weight_lb");
  if (line.is_catch_weight_snapshot && !weightText) {
    throw new Error("铁律 3：称重品退货必须填写退回实重");
  }
  const returnedWeight = weightText ? Number(weightText) : null;
  if (returnedWeight != null && (!Number.isFinite(returnedWeight) || returnedWeight < 0)) {
    throw new Error("退回实重必须是非负数字");
  }
  const { data: last } = await supabase.from("return_lines").select("line_no")
    .eq("return_note_id", returnNoteId).order("line_no", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("return_lines").insert({
    return_note_id: returnNoteId,
    line_no: Number(last?.line_no ?? 0) + 1,
    original_sl_line_id: line.id,
    product_id: line.product_id,
    original_batch_id: line.batch_id,
    qty_units: returnedUnits,
    returned_weight_lb: returnedWeight,
    is_catch_weight_snapshot: line.is_catch_weight_snapshot,
    unit_price_snapshot: 0,
    return_reason: text(formData, "return_reason") || "other",
    reason_detail: text(formData, "reason_detail") || null,
  });
  if (error) throw new Error(error.message);
  refreshReturns();
  revalidatePath(`/returns/return-notes/${returnNoteId}`);
}

/**
 * 铁律 4：司机仅可写 collected_at、photo_url、signed_by_name；
 * 司机不得决定 disposition，也不得借收货动作改变状态或责任归属。
 */
export async function driverCollectReturn(returnNoteId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const photoUrl = text(formData, "photo_url");
  const signedByName = text(formData, "signed_by_name");
  if (!photoUrl || !signedByName) throw new Error("退货照片和签收人均不能为空");
  const { error } = await supabase.from("return_notes").update({
    collected_at: new Date().toISOString(),
    photo_url: photoUrl,
    signed_by_name: signedByName,
  }).eq("id", returnNoteId);
  if (error) throw new Error(error.message);
  refreshReturns();
  revalidatePath(`/returns/return-notes/${returnNoteId}`);
}

/** 铁律 3/9：仓库确认收货时，称重品实重必须完整；数据库随后生成隔离批次。 */
export async function receiveReturn(returnNoteId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { count } = await supabase.from("return_lines")
    .select("id", { count: "exact", head: true }).eq("return_note_id", returnNoteId);
  if (!count) throw new Error("退货单至少需要一条退货行");
  const { error } = await supabase.from("return_notes")
    .update({ status: "received" }).eq("id", returnNoteId);
  if (error) throw new Error(error.message);
  refreshReturns();
  revalidatePath(`/returns/return-notes/${returnNoteId}`);
  revalidatePath("/inventory/quarantine");
}

/**
 * 铁律 9/11：退货先进入隔离批次；复上架只能调用 restock_return_line
 * 生成子批次，禁止把原批次或隔离批次直接恢复为 available。
 */
export async function disposeReturnLine(returnLineId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const disposition = text(formData, "disposition");
  if (disposition === "restock") {
    const targetLocationId = text(formData, "target_location_id");
    if (!targetLocationId) throw new Error("复上架必须选择目标储位");
    const { error } = await supabase.rpc("restock_return_line", {
      p_return_line_id: returnLineId,
      p_target_location_id: targetLocationId,
    });
    if (error) throw new Error(error.message);
  } else if (disposition === "scrap") {
    const { data: line, error: lineError } = await supabase.from("return_lines")
      .select("quarantine_batch_id, disposition").eq("id", returnLineId).single();
    if (lineError || !line?.quarantine_batch_id || line.disposition !== "pending") {
      throw new Error("退货行尚未隔离收货或已处置");
    }
    const { error: stockError } = await supabase.from("stock")
      .update({ qty_units: 0, qty_weight_lb: 0 })
      .eq("batch_id", line.quarantine_batch_id);
    if (stockError) throw new Error(stockError.message);
    const { error: batchError } = await supabase.from("batches")
      .update({ status: "depleted" }).eq("id", line.quarantine_batch_id);
    if (batchError) throw new Error(batchError.message);
    const { error } = await supabase.from("return_lines")
      .update({ disposition: "scrap" }).eq("id", returnLineId).eq("disposition", "pending");
    if (error) throw new Error(error.message);
  } else {
    throw new Error("处置方式只能是 scrap 或 restock");
  }
  const { data: disposedLine } = await supabase.from("return_lines")
    .select("return_note_id").eq("id", returnLineId).single();
  if (disposedLine) {
    const { count: pending } = await supabase.from("return_lines")
      .select("id", { count: "exact", head: true })
      .eq("return_note_id", disposedLine.return_note_id).eq("disposition", "pending");
    if (!pending) {
      await supabase.from("return_notes").update({ status: "processed" })
        .eq("id", disposedLine.return_note_id);
    }
  }
  refreshReturns();
  revalidatePath("/inventory/stock");
}

/** 路线 B：配送差异单独进入财务调整，不改写已签收 SL 快照。 */
export async function createDeliveryAdjustment(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const shippingListId = text(formData, "shipping_list_id");
  const reason = text(formData, "reason");
  if (!shippingListId || !reason) throw new Error("发运单与调整原因不能为空");
  const { error } = await supabase.from("delivery_adjustments").insert({
    shipping_list_id: shippingListId,
    return_note_id: text(formData, "return_note_id") || null,
    adjustment_type: text(formData, "adjustment_type") || "other",
    qty_units: number(formData, "qty_units"),
    adjusted_weight_lb: number(formData, "adjusted_weight_lb"),
    amount: number(formData, "amount"),
    responsibility: text(formData, "responsibility") || "under_investigation",
    reason,
  });
  if (error) throw new Error(error.message);
  refreshReturns();
}

export async function createTrip(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const driverId = text(formData, "driver_id");
  if (!driverId) throw new Error("必须选择司机");
  const { error } = await supabase.from("delivery_trips").insert({
    trip_number: text(formData, "trip_number") || `TRIP-${Date.now().toString(36).toUpperCase()}`,
    trip_date: text(formData, "trip_date") || new Date().toISOString().slice(0, 10),
    driver_id: driverId,
  });
  if (error) throw new Error(error.message);
  refreshReturns();
}

export async function assignReturnToTrip(returnNoteId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const tripId = text(formData, "delivery_trip_id");
  if (!tripId) throw new Error("必须选择配送趟次");
  const { error } = await supabase.from("return_notes")
    .update({ delivery_trip_id: tripId }).eq("id", returnNoteId);
  if (error) throw new Error(error.message);
  refreshReturns();
}
