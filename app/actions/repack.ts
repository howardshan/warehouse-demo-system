"use server";

import { revalidatePath } from "next/cache";
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

function quantity(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  if (!Number.isFinite(value) || value < 0) throw new Error(`${key} 必须是非负数字`);
  return value;
}

function refreshRepack() {
  revalidatePath("/inventory/repack");
  revalidatePath("/inventory/stock");
  revalidatePath("/inventory/batches");
  revalidatePath("/sales/history/trace");
}

/**
 * 铁律 2/3：重包投入同时保留件数与实重；成本由产出行快照继承，
 * 不得用当前商品售价或平均重量代替批次成本/实重。
 */
export async function createRepackOrder(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const inputUnits = quantity(formData, "input_qty_units");
  const inputWeight = quantity(formData, "input_weight_lb");
  if (inputUnits === 0 && inputWeight === 0) throw new Error("重包投入必须大于零");
  const [selectedBatchId, selectedLocationId] = text(formData, "input_source").split("|");
  const inputBatchId = text(formData, "input_batch_id") || selectedBatchId;
  const sourceLocationId = text(formData, "source_location_id") || selectedLocationId;
  if (!inputBatchId || !sourceLocationId) throw new Error("必须选择来源批次与储位");
  const { error } = await supabase.from("repack_orders").insert({
    repack_number: text(formData, "repack_number") || `RP-${Date.now().toString(36).toUpperCase()}`,
    input_batch_id: inputBatchId,
    source_location_id: sourceLocationId,
    input_qty_units: inputUnits,
    input_weight_lb: inputWeight,
    scheduled_date: text(formData, "scheduled_date") || null,
    notes: text(formData, "notes") || null,
  });
  if (error) throw new Error(error.message);
  refreshRepack();
}

/**
 * 铁律 2/11：产出批次成本写入工单快照，完成时数据库以 input_batch_id
 * 作为 parent_batch_id 创建新批次，保持完整父子链。
 */
export async function addRepackOutput(repackOrderId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const qtyUnits = quantity(formData, "qty_units");
  const weightLb = quantity(formData, "weight_lb");
  if (qtyUnits === 0 && weightLb === 0) throw new Error("重包产出必须大于零");
  const { data: last } = await supabase.from("repack_outputs").select("line_no")
    .eq("repack_order_id", repackOrderId).order("line_no", { ascending: false }).limit(1).maybeSingle();
  const { data: order } = await supabase.from("repack_orders")
    .select("input_batch_id, batches(unit_cost)").eq("id", repackOrderId).single();
  if (!order) throw new Error("重包工单不存在");
  const batch = Array.isArray(order.batches) ? order.batches[0] : order.batches;
  const explicitCost = text(formData, "unit_cost");
  const { error } = await supabase.from("repack_outputs").insert({
    repack_order_id: repackOrderId,
    line_no: Number(last?.line_no ?? 0) + 1,
    product_id: text(formData, "product_id"),
    target_location_id: text(formData, "target_location_id"),
    lot_no: text(formData, "lot_no"),
    expiry_date: text(formData, "expiry_date") || null,
    qty_units: qtyUnits,
    weight_lb: weightLb,
    unit_cost: explicitCost ? Number(explicitCost) : Number(batch?.unit_cost ?? 0),
  });
  if (error) throw new Error(error.message);
  refreshRepack();
}

export async function completeRepack(repackOrderId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("repack_orders")
    .update({ status: "completed" }).eq("id", repackOrderId);
  if (error) throw new Error(error.message);
  refreshRepack();
}

/** 铁律 11：追溯查询只读 v_batch_traceability，不在应用层猜测父批次。 */
export async function traceByBatch(batchSearch: string) {
  const { supabase } = await requireUser();
  const search = batchSearch.trim();
  if (!search) return [];
  let batchId = search;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(search)) {
    const { data: batch } = await supabase.from("batches")
      .select("id").ilike("lot_no", `%${search}%`).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!batch) return [];
    batchId = batch.id;
  }
  const { data, error } = await supabase.from("v_batch_traceability")
    .select("batch_id, product_id, lot_no, origin, ancestor_batch_id, ancestor_product_id, ancestor_lot_no, ancestor_origin, depth")
    .eq("batch_id", batchId).order("depth");
  if (error) throw new Error(error.message);
  return data ?? [];
}
