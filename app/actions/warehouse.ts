"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkCredit } from "@/lib/domain/credit";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return { supabase, user };
}

function refreshWarehouse() {
  revalidatePath("/warehouse/picklists");
  revalidatePath("/warehouse/picking");
  revalidatePath("/warehouse/weighing");
  revalidatePath("/warehouse/pending-weight");
  revalidatePath("/warehouse/shipping");
}

export async function generatePickList(salesOrderId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data: lines } = await supabase.from("so_lines")
    .select("id, line_no, product_id, allocated_units")
    .eq("sales_order_id", salesOrderId).order("line_no");
  if (!lines?.length) throw new Error("订单没有可拣行");

  const { data: pick, error } = await supabase.from("pick_lists").insert({
    pick_number: `PK-${Date.now().toString(36).toUpperCase()}`,
    sales_order_id: salesOrderId,
  }).select("id").single();
  if (error) throw new Error(error.message);

  let pickLineNo = 1;
  for (const line of lines) {
    let remaining = Number(line.allocated_units);
    const { data: stocks } = await supabase.from("stock")
      .select("location_id, batch_id, allocated_units, batches!inner(product_id, status, expiry_date)")
      .eq("batches.product_id", line.product_id)
      .eq("batches.status", "available")
      .gt("allocated_units", 0)
      .order("batches(expiry_date)", { nullsFirst: false });
    for (const stock of stocks ?? []) {
      if (remaining <= 0) break;
      const requested = Math.min(remaining, Number(stock.allocated_units));
      const { error: lineError } = await supabase.from("pick_list_lines").insert({
        pick_list_id: pick.id,
        so_line_id: line.id,
        line_no: pickLineNo++,
        batch_id: stock.batch_id,
        source_location_id: stock.location_id,
        requested_units: requested,
      });
      if (lineError) throw new Error(lineError.message);
      remaining -= requested;
    }
    if (remaining > 0) throw new Error(`订单行 ${line.line_no} 的分配库存无法定位`);
  }
  // 生成拣货单触发 DB 锁单，防止商业字段继续变化。
  refreshWarehouse();
  revalidatePath(`/sales/orders/${salesOrderId}`);
}

export async function withdrawPickList(pickListId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) throw new Error("撤销必须填写原因");
  const { error } = await supabase.rpc("cancel_pick_list", {
    p_pick_list_id: pickListId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  refreshWarehouse();
}

/**
 * 铁律 14: 实拣数量与要求数量不一致时必须填写差异原因，不能静默吞掉短拣或多拣。
 */
export async function recordPick(pickLineId: string, formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const pickedUnits = Number(formData.get("picked_units"));
  const { data: line } = await supabase.from("pick_list_lines")
    .select("pick_list_id, requested_units").eq("id", pickLineId).single();
  if (!line) throw new Error("拣货行不存在");
  const varianceReason = String(formData.get("variance_reason") || "") || null;
  if (pickedUnits !== Number(line.requested_units) && !varianceReason) {
    throw new Error("实拣数量不一致时必须填写差异原因（铁律 14）");
  }
  const { error } = await supabase.from("pick_list_lines").update({
    picked_units: pickedUnits,
    tote_id: String(formData.get("tote_id") || "") || null,
    variance_reason: varianceReason,
    picked_by: user.id,
    picked_at: new Date().toISOString(),
  }).eq("id", pickLineId);
  if (error) throw new Error(error.message);

  const { data: open } = await supabase.from("pick_list_lines").select("id")
    .eq("pick_list_id", line.pick_list_id).is("picked_units", null).limit(1);
  await supabase.from("pick_lists").update({
    status: open?.length ? "picking" : "picked_pending_weight",
    started_at: new Date().toISOString(),
    picked_at: open?.length ? null : new Date().toISOString(),
  }).eq("id", line.pick_list_id);
  refreshWarehouse();
}

export async function recordWeight(pickLineId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const toteScan = String(formData.get("tote_id") || "").trim();
  const actualWeight = Number(formData.get("actual_weight_lb"));
  let { data: tote } = await supabase.from("totes").select("id")
    .eq("code", toteScan).maybeSingle();
  if (!tote && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(toteScan)) {
    const result = await supabase.from("totes").select("id").eq("id", toteScan).maybeSingle();
    tote = result.data;
  }
  if (!tote) throw new Error("周转筐码不存在");
  const { data: line } = await supabase.from("pick_list_lines")
    .select("pick_list_id, expected_weight_lb").eq("id", pickLineId).single();
  if (!line) throw new Error("称重行不存在");
  const expected = line.expected_weight_lb == null ? null : Number(line.expected_weight_lb);
  const varianceReason = expected != null && expected !== actualWeight
    ? String(formData.get("variance_reason") || "") || "underweight"
    : undefined;
  const { error } = await supabase.from("pick_list_lines").update({
    tote_id: tote.id,
    actual_weight_lb: actualWeight,
    ...(varianceReason ? { variance_reason: varianceReason } : {}),
  }).eq("id", pickLineId);
  if (error) throw new Error(error.message);

  const { data: incomplete } = await supabase.from("pick_list_lines")
    .select("id, so_lines!inner(is_catch_weight_snapshot)")
    .eq("pick_list_id", line.pick_list_id)
    .eq("so_lines.is_catch_weight_snapshot", true)
    .is("actual_weight_lb", null).limit(1);
  if (!incomplete?.length) {
    const { error: statusError } = await supabase.from("pick_lists")
      .update({ status: "weighed" }).eq("id", line.pick_list_id);
    if (statusError) throw new Error(statusError.message);
  }
  refreshWarehouse();
}

export async function createShippingList(pickListId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data: pick } = await supabase.from("pick_lists")
    .select("sales_order_id, status, sales_orders!inner(customer_id)")
    .eq("id", pickListId).single();
  if (!pick || pick.status !== "weighed") throw new Error("只有已称重拣货单可生成发运单");
  const relation = pick.sales_orders as unknown as { customer_id: string };
  const { data: shipping, error } = await supabase.from("shipping_lists").insert({
    sl_number: `SL-${Date.now().toString(36).toUpperCase()}`,
    pick_list_id: pickListId,
    sales_order_id: pick.sales_order_id,
    customer_id: relation.customer_id,
    status: "ready",
  }).select("id").single();
  if (error) throw new Error(error.message);

  const { data: lines } = await supabase.from("pick_list_lines")
    .select("id, so_line_id, line_no, batch_id, picked_units, actual_weight_lb, so_lines!inner(product_id)")
    .eq("pick_list_id", pickListId).order("line_no");
  for (const line of lines ?? []) {
    const soLine = line.so_lines as unknown as { product_id: string };
    const { error: lineError } = await supabase.from("sl_lines").insert({
      shipping_list_id: shipping.id,
      pick_list_line_id: line.id,
      so_line_id: line.so_line_id,
      line_no: line.line_no,
      product_id: soLine.product_id,
      batch_id: line.batch_id,
      shipped_units: Number(line.picked_units ?? 0),
      shipped_weight_lb: line.actual_weight_lb,
      is_catch_weight_snapshot: false,
      unit_price: 0,
      cost_snapshot: 0,
    });
    if (lineError) throw new Error(lineError.message);
  }
  refreshWarehouse();
}

/**
 * 铁律 6: 发运装车前必须执行第二次信用检查（shipping_release）。
 * 数据库触发器再次记录检查并阻断无权限的超限放行。
 */
export async function creditCheckAndReleaseShipping(shippingListId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data: shipping } = await supabase.from("shipping_lists")
    .select("customer_id").eq("id", shippingListId).single();
  if (!shipping) throw new Error("发运单不存在");
  const [{ data: customer }, { data: exposure }, { data: setting }] = await Promise.all([
    supabase.from("customers").select("credit_limit, credit_status, overdue_block_days")
      .eq("id", shipping.customer_id).single(),
    supabase.from("v_credit_exposure").select("exposure").eq("customer_id", shipping.customer_id).single(),
    supabase.from("settings").select("value").eq("key", "credit_warning_pct").single(),
  ]);
  if (!customer) throw new Error("客户不存在");
  const result = checkCredit({
    creditLimit: Number(customer.credit_limit),
    creditStatus: customer.credit_status,
    overdueBlockDays: Number(customer.overdue_block_days),
  }, Number(exposure?.exposure ?? 0), Number(setting?.value ?? 80), "shipping_release");
  if (result === "blocked") throw new Error("信用复核未通过，发运不得放行");
  const { error } = await supabase.from("shipping_lists")
    .update({ status: "released" }).eq("id", shippingListId);
  if (error) throw new Error(error.message);
  refreshWarehouse();
}

export async function signShippingList(shippingListId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const signedByName = String(formData.get("signed_by_name") || "").trim();
  if (!signedByName) throw new Error("签收人不能为空");
  const { error } = await supabase.from("shipping_lists").update({
    status: "signed",
    signed_by_name: signedByName,
    proof_url: String(formData.get("proof_url") || "") || null,
    signed_at: new Date().toISOString(),
  }).eq("id", shippingListId);
  if (error) throw new Error(error.message);
  // DB 在签收后关闭 SO，并释放未发数量及对应库存分配。
  refreshWarehouse();
  revalidatePath("/finance/billing-queue");
  revalidatePath("/finance/credit-control");
}
