"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkCredit } from "@/lib/domain/credit";
import { calcMarginPct, isBelowCost, needsApproval } from "@/lib/domain/margin";

type Db = Awaited<ReturnType<typeof createClient>>;
type Result = { ok: true; id?: string; status?: string } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return { supabase, user };
}

function numberValue(value: FormDataEntryValue | null, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function orderAmount(lines: Array<Record<string, unknown>>) {
  return lines.reduce((sum, line) => {
    const quantity = line.is_catch_weight_snapshot
      ? Number(line.estimated_weight_lb ?? 0)
      : Number(line.qty_units ?? 0);
    return sum + quantity * Number(line.unit_price ?? 0);
  }, 0);
}

async function settingNumber(db: Db, key: string, fallback: number) {
  const { data } = await db.from("settings").select("value").eq("key", key).maybeSingle();
  const value = Number(data?.value);
  return Number.isFinite(value) ? value : fallback;
}

async function releaseLineAllocation(db: Db, line: Record<string, unknown>) {
  let remaining = Number(line.allocated_units ?? 0);
  if (remaining <= 0) return;
  const { data: rows } = await db
    .from("stock")
    .select("id, allocated_units, batches!inner(product_id)")
    .eq("batches.product_id", String(line.product_id))
    .gt("allocated_units", 0)
    .order("updated_at");
  for (const row of rows ?? []) {
    if (remaining <= 0) break;
    const released = Math.min(remaining, Number(row.allocated_units));
    const { error } = await db.from("stock")
      .update({ allocated_units: Number(row.allocated_units) - released })
      .eq("id", row.id)
      .eq("allocated_units", row.allocated_units);
    if (error) throw new Error(error.message);
    remaining -= released;
  }
}

async function allocateOrder(db: Db, salesOrderId: string) {
  const { data: lines, error } = await db.from("so_lines")
    .select("id, product_id, qty_units, allocated_units")
    .eq("sales_order_id", salesOrderId)
    .order("line_no");
  if (error) throw new Error(error.message);

  for (const line of lines ?? []) {
    let remaining = Number(line.qty_units) - Number(line.allocated_units);
    if (remaining <= 0) continue;
    const { data: stockRows } = await db
      .from("stock")
      .select("id, qty_units, allocated_units, batches!inner(product_id, status, expiry_date), locations!inner(is_active, type)")
      .eq("batches.product_id", line.product_id)
      .eq("batches.status", "available")
      .eq("locations.is_active", true)
      .neq("locations.type", "quarantine")
      .order("batches(expiry_date)", { nullsFirst: false });
    const available = (stockRows ?? []).reduce(
      (sum, row) => sum + Number(row.qty_units) - Number(row.allocated_units), 0,
    );
    if (available < remaining) throw new Error(`ATP 不足：订单行 ${line.id} 尚缺 ${remaining - available} 件`);

    let allocated = Number(line.allocated_units);
    for (const row of stockRows ?? []) {
      if (remaining <= 0) break;
      const free = Number(row.qty_units) - Number(row.allocated_units);
      const take = Math.min(free, remaining);
      if (take <= 0) continue;
      const { error: stockError } = await db.from("stock")
        .update({ allocated_units: Number(row.allocated_units) + take })
        .eq("id", row.id)
        .eq("allocated_units", row.allocated_units);
      if (stockError) throw new Error(stockError.message);
      remaining -= take;
      allocated += take;
    }
    const { error: lineError } = await db.from("so_lines")
      .update({ allocated_units: allocated }).eq("id", line.id);
    if (lineError) throw new Error(lineError.message);
  }
}

/**
 * 铁律 1/2: unit_price 与最高在库成本必须写入订单行快照，不能在历史展示时回查主档。
 * 铁律 5/6: 信用占用包含已签收未开票，并在 SO 确认与发运放行各检查一次。
 * 铁律 9: 未锁定订单每次改行后都重新执行信用、毛利和 ATP 闸门。
 */
export async function revalidateSoGates(salesOrderId: string): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    const { data: order, error: orderError } = await supabase.from("sales_orders")
      .select("id, customer_id, status, locked_at").eq("id", salesOrderId).single();
    if (orderError) throw new Error(orderError.message);
    if (order.locked_at) throw new Error("订单已锁定，不能重新校验");

    const [{ data: customer }, { data: exposure }, { data: lines }] = await Promise.all([
      supabase.from("customers").select("credit_limit, credit_status, overdue_block_days")
        .eq("id", order.customer_id).single(),
      supabase.from("v_credit_exposure").select("exposure").eq("customer_id", order.customer_id).maybeSingle(),
      supabase.from("so_lines").select("id, product_id, qty_units, estimated_weight_lb, is_catch_weight_snapshot, unit_price, cost_snapshot, allocated_units")
        .eq("sales_order_id", salesOrderId),
    ]);
    if (!customer) throw new Error("客户不存在");
    if (!lines?.length) throw new Error("订单至少需要一行商品");

    const [warningPct, marginThreshold] = await Promise.all([
      settingNumber(supabase, "credit_warning_pct", 80),
      settingNumber(supabase, "margin_threshold_pct", 15),
    ]);
    const amount = orderAmount(lines);
    const currentExposure = Number(exposure?.exposure ?? 0);
    const effectiveExposure = ["confirmed", "picking", "shipped"].includes(order.status)
      ? currentExposure : currentExposure + amount;
    const creditResult = checkCredit(
      {
        creditLimit: Number(customer.credit_limit),
        creditStatus: customer.credit_status,
        overdueBlockDays: Number(customer.overdue_block_days),
      },
      effectiveExposure,
      warningPct,
      "so_confirm",
    );
    await supabase.from("credit_checks").insert({
      customer_id: order.customer_id,
      checkpoint: "so_confirm",
      ref_type: "sales_order",
      ref_id: salesOrderId,
      exposure: effectiveExposure,
      credit_limit: customer.credit_limit,
      result: creditResult,
    });

    const marginProblems = lines.filter((line) =>
      needsApproval(calcMarginPct(Number(line.unit_price), Number(line.cost_snapshot)), marginThreshold),
    );
    const { data: approved } = await supabase.from("so_approvals")
      .select("approval_type").eq("sales_order_id", salesOrderId).eq("status", "approved");
    const approvedTypes = new Set((approved ?? []).map((item) => item.approval_type));
    const needsBelowCost = marginProblems.some((line) =>
      isBelowCost(Number(line.unit_price), Number(line.cost_snapshot)),
    );
    const marginApproved = marginProblems.length === 0 ||
      (approvedTypes.has("margin") && (!needsBelowCost || approvedTypes.has("below_cost")));
    const status = creditResult === "blocked"
      ? "credit_hold"
      : marginApproved ? "confirmed" : "pending_approval";

    if (status === "confirmed") {
      await allocateOrder(supabase, salesOrderId);
    } else {
      for (const line of lines) {
        await releaseLineAllocation(supabase, line);
        await supabase.from("so_lines").update({ allocated_units: 0 }).eq("id", line.id);
      }
    }
    const { error: updateError } = await supabase.from("sales_orders")
      .update({ status }).eq("id", salesOrderId);
    if (updateError) throw new Error(updateError.message);
    revalidatePath("/sales/orders");
    revalidatePath(`/sales/orders/${salesOrderId}`);
    return { ok: true, status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "订单校验失败" };
  }
}

export async function createSalesOrder(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const customerId = String(formData.get("customer_id"));
  const addressId = String(formData.get("delivery_address_id") || "") || null;
  const [{ data: customer }, { data: address }] = await Promise.all([
    supabase.from("customers").select("name, payment_terms_days, credit_limit").eq("id", customerId).single(),
    addressId
      ? supabase.from("customer_addresses").select("address").eq("id", addressId).eq("customer_id", customerId).single()
      : supabase.from("customer_addresses").select("address").eq("customer_id", customerId).eq("is_default", true).limit(1).maybeSingle(),
  ]);
  if (!customer || !address) throw new Error("客户或送货地址无效");
  const soNumber = `SO-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase.from("sales_orders").insert({
    so_number: soNumber,
    customer_id: customerId,
    delivery_address_id: addressId,
    sales_rep_id: user.id,
    customer_name_snapshot: customer.name,
    delivery_address_snapshot: address.address,
    payment_terms_days_snapshot: customer.payment_terms_days,
    credit_limit_snapshot: customer.credit_limit,
    requested_delivery_date: String(formData.get("requested_delivery_date") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/sales/orders/${data.id}`);
}

export async function addSoLine(salesOrderId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const productId = String(formData.get("product_id"));
  const [{ data: product }, { data: cost }, { data: lastLine }] = await Promise.all([
    supabase.from("products").select("current_price, is_catch_weight, avg_weight_lb").eq("id", productId).single(),
    supabase.from("v_max_cost_in_stock").select("max_unit_cost").eq("product_id", productId).maybeSingle(),
    supabase.from("so_lines").select("line_no").eq("sales_order_id", salesOrderId).order("line_no", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!product || cost?.max_unit_cost == null) throw new Error("商品或在库成本不存在");
  const qty = numberValue(formData.get("qty_units"));
  const explicitPrice = String(formData.get("unit_price") || "");
  const { error } = await supabase.from("so_lines").insert({
    sales_order_id: salesOrderId,
    line_no: Number(lastLine?.line_no ?? 0) + 1,
    product_id: productId,
    qty_units: qty,
    estimated_weight_lb: product.is_catch_weight
      ? numberValue(formData.get("estimated_weight_lb"), qty * Number(product.avg_weight_lb ?? 0))
      : null,
    is_catch_weight_snapshot: product.is_catch_weight,
    unit_price: explicitPrice ? Number(explicitPrice) : Number(product.current_price),
    price_overridden: Boolean(explicitPrice),
    cost_snapshot: Number(cost.max_unit_cost),
    notes: String(formData.get("notes") || "") || null,
  });
  if (error) throw new Error(error.message);
  const result = await revalidateSoGates(salesOrderId);
  if (!result.ok) throw new Error(result.error);
}

export async function updateSoLine(lineId: string, salesOrderId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const { data: oldLine } = await supabase.from("so_lines").select("*").eq("id", lineId).single();
  if (!oldLine) throw new Error("订单行不存在");
  await releaseLineAllocation(supabase, oldLine);
  const { error } = await supabase.from("so_lines").update({
    qty_units: numberValue(formData.get("qty_units")),
    estimated_weight_lb: String(formData.get("estimated_weight_lb") || "")
      ? numberValue(formData.get("estimated_weight_lb")) : null,
    unit_price: numberValue(formData.get("unit_price")),
    price_overridden: true,
    allocated_units: 0,
    notes: String(formData.get("notes") || "") || null,
  }).eq("id", lineId);
  if (error) throw new Error(error.message);
  const result = await revalidateSoGates(salesOrderId);
  if (!result.ok) throw new Error(result.error);
}

export async function deleteSoLine(lineId: string, salesOrderId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data: line } = await supabase.from("so_lines").select("*").eq("id", lineId).single();
  if (line) await releaseLineAllocation(supabase, line);
  const { error } = await supabase.from("so_lines").delete().eq("id", lineId);
  if (error) throw new Error(error.message);
  const { count } = await supabase.from("so_lines").select("id", { count: "exact", head: true })
    .eq("sales_order_id", salesOrderId);
  if (count) {
    const result = await revalidateSoGates(salesOrderId);
    if (!result.ok) throw new Error(result.error);
  } else {
    await supabase.from("sales_orders").update({ status: "draft" }).eq("id", salesOrderId);
  }
  revalidatePath(`/sales/orders/${salesOrderId}`);
}

export async function confirmSalesOrder(salesOrderId: string): Promise<void> {
  const result = await revalidateSoGates(salesOrderId);
  if (!result.ok) throw new Error(result.error);
}

export async function requestMarginApproval(salesOrderId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const type = String(formData.get("approval_type") || "margin");
  const { error } = await supabase.from("so_approvals").insert({
    sales_order_id: salesOrderId,
    approval_type: type === "below_cost" ? "below_cost" : "margin",
    reason: String(formData.get("reason") || "毛利低于系统阈值"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/sales/approvals");
}

async function decideMarginApproval(approvalId: string, status: "approved" | "rejected", formData: FormData) {
  const { supabase, user } = await requireUser();
  const { data: approval, error } = await supabase.from("so_approvals").update({
    status,
    decided_by: user.id,
    decided_at: new Date().toISOString(),
    decision_note: String(formData.get("decision_note") || "") || null,
  }).eq("id", approvalId).select("sales_order_id").single();
  if (error) throw new Error(error.message);
  const result = await revalidateSoGates(approval.sales_order_id);
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/sales/approvals");
}

export async function approveMarginApproval(approvalId: string, formData: FormData): Promise<void> {
  await decideMarginApproval(approvalId, "approved", formData);
}

export async function rejectMarginApproval(approvalId: string, formData: FormData): Promise<void> {
  await decideMarginApproval(approvalId, "rejected", formData);
}
