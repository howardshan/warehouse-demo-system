"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type PoInput = {
  supplier_id: string;
  order_date?: string;
  expected_date?: string | null;
  currency_code?: string;
  notes?: string | null;
};

type PoLineInput = {
  product_id: string;
  qty_units: number;
  estimated_weight_lb?: number | null;
  unit_cost: number;
};

export type GrLineInput = {
  id: string;
  supplier_claimed_units: number;
  actual_units: number;
  actual_weight_lb: number;
  lot_no: string;
  expiry_date?: string | null;
  variance_reason?: string | null;
  notes?: string | null;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return { supabase, user };
}

function failure(error: unknown) {
  return {
    ok: false as const,
    error: error instanceof Error ? error.message : String(error),
  };
}

export async function createPO(input: PoInput) {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: "",
        supplier_id: input.supplier_id,
        order_date: input.order_date || new Date().toISOString().slice(0, 10),
        expected_date: input.expected_date || null,
        currency_code: (input.currency_code || "USD").toUpperCase(),
        notes: input.notes || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/purchasing/pos");
    return { ok: true as const, id: data.id };
  } catch (error) {
    return failure(error);
  }
}

export async function addPoLine(purchaseOrderId: string, input: PoLineInput) {
  try {
    const { supabase } = await requireUser();
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("status")
      .eq("id", purchaseOrderId)
      .single();
    if (poError) throw poError;
    if (po.status !== "draft") throw new Error("只能编辑草稿采购单");

    const { data: lastLine } = await supabase
      .from("po_lines")
      .select("line_no")
      .eq("purchase_order_id", purchaseOrderId)
      .order("line_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("po_lines").insert({
      purchase_order_id: purchaseOrderId,
      line_no: (lastLine?.line_no ?? 0) + 1,
      product_id: input.product_id,
      qty_units: input.qty_units,
      estimated_weight_lb: input.estimated_weight_lb || null,
      unit_cost: input.unit_cost,
    });
    if (error) throw error;
    revalidatePath(`/purchasing/pos/${purchaseOrderId}`);
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
}

export async function issuePO(purchaseOrderId: string) {
  try {
    const { supabase } = await requireUser();
    const { count, error: countError } = await supabase
      .from("po_lines")
      .select("id", { count: "exact", head: true })
      .eq("purchase_order_id", purchaseOrderId);
    if (countError) throw countError;
    if (!count) throw new Error("采购单至少需要一条明细");
    const { error } = await supabase
      .from("purchase_orders")
      .update({ status: "issued", issued_at: new Date().toISOString() })
      .eq("id", purchaseOrderId)
      .eq("status", "draft");
    if (error) throw error;
    revalidatePath("/purchasing/pos");
    revalidatePath(`/purchasing/pos/${purchaseOrderId}`);
    revalidatePath("/purchasing/receiving");
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
}

export async function createGoodsReceipt(
  purchaseOrderId: string,
  input?: { supplier_document_no?: string | null; notes?: string | null },
) {
  try {
    const { supabase } = await requireUser();
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("status")
      .eq("id", purchaseOrderId)
      .single();
    if (poError) throw poError;
    if (!["issued", "partially_received"].includes(po.status)) {
      throw new Error("只能从已签发或部分收货的采购单开始收货");
    }
    const { data: poLines, error: linesError } = await supabase
      .from("po_lines")
      .select("id, line_no, qty_units")
      .eq("purchase_order_id", purchaseOrderId)
      .order("line_no");
    if (linesError) throw linesError;
    if (!poLines?.length) throw new Error("采购单没有明细");

    const { data: receipt, error: receiptError } = await supabase
      .from("goods_receipts")
      .insert({
        gr_number: "",
        purchase_order_id: purchaseOrderId,
        supplier_document_no: input?.supplier_document_no || null,
        notes: input?.notes || null,
      })
      .select("id")
      .single();
    if (receiptError) throw receiptError;

    // 铁律 13：盲收。ordered_units 只由服务端从 PO 复制，绝不接受 UI 输入。
    const { error: grLinesError } = await supabase.from("gr_lines").insert(
      poLines.map((line) => ({
        goods_receipt_id: receipt.id,
        po_line_id: line.id,
        line_no: line.line_no,
        ordered_units: line.qty_units,
        supplier_claimed_units: 0,
        actual_units: 0,
        actual_weight_lb: 0,
        lot_no: "__PENDING__",
      })),
    );
    if (grLinesError) {
      await supabase.from("goods_receipts").delete().eq("id", receipt.id);
      throw grLinesError;
    }
    revalidatePath("/purchasing/receiving");
    return { ok: true as const, id: receipt.id };
  } catch (error) {
    return failure(error);
  }
}

export async function saveGrLines(goodsReceiptId: string, lines: GrLineInput[]) {
  try {
    const { supabase } = await requireUser();
    const { data: receipt, error: receiptError } = await supabase
      .from("goods_receipts")
      .select("status")
      .eq("id", goodsReceiptId)
      .single();
    if (receiptError) throw receiptError;
    if (receipt.status !== "draft") throw new Error("只能编辑草稿收货单");

    for (const line of lines) {
      const claimed = Number(line.supplier_claimed_units);
      const actual = Number(line.actual_units);
      const weight = Number(line.actual_weight_lb);
      if ([claimed, actual, weight].some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("数量和重量必须为非负数");
      }
      if (!line.lot_no.trim()) throw new Error("供应商批号不能为空");
      if (actual !== claimed && !line.variance_reason) {
        throw new Error("实收与供应商声称数量不同时必须选择差异原因");
      }
      const { error } = await supabase
        .from("gr_lines")
        .update({
          supplier_claimed_units: claimed,
          actual_units: actual,
          actual_weight_lb: weight,
          lot_no: line.lot_no.trim(),
          expiry_date: line.expiry_date || null,
          variance_reason: actual === claimed ? null : line.variance_reason,
          notes: line.notes || null,
        })
        .eq("id", line.id)
        .eq("goods_receipt_id", goodsReceiptId);
      if (error) throw error;
    }
    // 铁律 13：本动作不读取、更不回传 ordered_units 给收货界面。
    revalidatePath(`/purchasing/receiving/${goodsReceiptId}`);
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
}

export async function submitGoodsReceipt(goodsReceiptId: string) {
  try {
    const { supabase } = await requireUser();
    const { data: lines, error: linesError } = await supabase
      .from("gr_lines")
      .select("ordered_units, supplier_claimed_units, actual_units, lot_no")
      .eq("goods_receipt_id", goodsReceiptId);
    if (linesError) throw linesError;
    if (!lines?.length || lines.some((line) => line.lot_no === "__PENDING__")) {
      throw new Error("请先完整保存全部收货明细");
    }
    // 三单核对：PO 数量、供应商送货单数量、仓库盲收数量三者独立比较。
    const matched = lines.every(
      (line) =>
        Number(line.ordered_units) === Number(line.supplier_claimed_units) &&
        Number(line.supplier_claimed_units) === Number(line.actual_units),
    );
    const { error } = await supabase
      .from("goods_receipts")
      .update({ status: matched ? "matched" : "discrepancy" })
      .eq("id", goodsReceiptId)
      .eq("status", "draft");
    if (error) throw error;
    revalidatePath("/purchasing/receiving");
    revalidatePath(`/purchasing/receiving/${goodsReceiptId}`);
    return { ok: true as const, matched };
  } catch (error) {
    return failure(error);
  }
}

export async function postGoodsReceipt(goodsReceiptId: string) {
  try {
    const { supabase } = await requireUser();
    const { data: receipt, error: receiptError } = await supabase
      .from("goods_receipts")
      .select("id, purchase_order_id, status, received_at")
      .eq("id", goodsReceiptId)
      .single();
    if (receiptError) throw receiptError;
    if (receipt.status !== "matched") throw new Error("只有核对一致的收货单可以过账");

    const { data: lines, error: linesError } = await supabase
      .from("gr_lines")
      .select("id, po_line_id, actual_units, actual_weight_lb, lot_no, expiry_date")
      .eq("goods_receipt_id", goodsReceiptId);
    if (linesError) throw linesError;

    for (const line of lines ?? []) {
      const { data: poLine, error: poLineError } = await supabase
        .from("po_lines")
        .select("product_id, unit_cost, products(temp_zone, inspection_method)")
        .eq("id", line.po_line_id)
        .single();
      if (poLineError) throw poLineError;
      const product = Array.isArray(poLine.products) ? poLine.products[0] : poLine.products;
      if (!product) throw new Error("采购行缺少商品");
      const { data: reserve, error: reserveError } = await supabase
        .from("locations")
        .select("id")
        .eq("type", "reserve")
        .eq("temp_zone", product.temp_zone)
        .eq("is_active", true)
        .order("code")
        .limit(1)
        .maybeSingle();
      if (reserveError) throw reserveError;
      if (!reserve) throw new Error(`缺少 ${product.temp_zone} 温区的可用存储位`);

      const { data: batch, error: batchError } = await supabase
        .from("batches")
        .insert({
          product_id: poLine.product_id,
          origin: "purchase",
          unit_cost: poLine.unit_cost,
          lot_no: line.lot_no,
          expiry_date: line.expiry_date,
          gr_line_id: line.id,
          status: product.inspection_method === "skip" ? "available" : "quality_hold",
          received_at: receipt.received_at,
        })
        .select("id")
        .single();
      if (batchError) throw batchError;
      const { error: stockError } = await supabase.from("stock").insert({
        location_id: reserve.id,
        batch_id: batch.id,
        qty_units: line.actual_units,
        qty_weight_lb: line.actual_weight_lb,
      });
      if (stockError) throw stockError;
    }

    const postedAt = new Date().toISOString();
    const { error: postError } = await supabase
      .from("goods_receipts")
      .update({ status: "posted", posted_at: postedAt })
      .eq("id", goodsReceiptId)
      .eq("status", "matched");
    if (postError) throw postError;

    for (const line of lines ?? []) {
      const { data: totals } = await supabase
        .from("gr_lines")
        .select("actual_units, actual_weight_lb, goods_receipts!inner(status)")
        .eq("po_line_id", line.po_line_id)
        .eq("goods_receipts.status", "posted");
      const receivedUnits = (totals ?? []).reduce(
        (sum, row) => sum + Number(row.actual_units),
        0,
      );
      const receivedWeight = (totals ?? []).reduce(
        (sum, row) => sum + Number(row.actual_weight_lb),
        0,
      );
      await supabase
        .from("po_lines")
        .update({
          received_units: receivedUnits,
          received_weight_lb: receivedWeight,
        })
        .eq("id", line.po_line_id);
    }

    const { data: poLines } = await supabase
      .from("po_lines")
      .select("qty_units, received_units")
      .eq("purchase_order_id", receipt.purchase_order_id);
    const fullyReceived =
      !!poLines?.length &&
      poLines.every((line) => Number(line.received_units) >= Number(line.qty_units));
    await supabase
      .from("purchase_orders")
      .update({ status: fullyReceived ? "received" : "partially_received" })
      .eq("id", receipt.purchase_order_id);

    revalidatePath("/purchasing/receiving");
    revalidatePath(`/purchasing/receiving/${goodsReceiptId}`);
    revalidatePath("/inventory/batches");
    revalidatePath("/inventory/stock");
    revalidatePath("/purchasing/price-alerts");
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
}

export async function listPriceAlerts() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("price_change_alerts")
    .select(
      "id, previous_cost, new_cost, cost_increase_pct, current_price, implied_margin_pct, created_at, products(id, sku, name)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function dismissAlert(alertId: string) {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("price_change_alerts")
      .update({
        status: "dismissed",
        handled_by: user.id,
        handled_at: new Date().toISOString(),
      })
      .eq("id", alertId)
      .eq("status", "open");
    if (error) throw error;
    revalidatePath("/purchasing/price-alerts");
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
}

export async function repriceFromAlert(alertId: string) {
  try {
    const { supabase, user } = await requireUser();
    const { data: alert, error: alertError } = await supabase
      .from("price_change_alerts")
      .select("product_id, new_batch_id, previous_cost, new_cost, current_price, status")
      .eq("id", alertId)
      .single();
    if (alertError) throw alertError;
    if (alert.status !== "open") throw new Error("该提醒已处理");
    const ratio =
      Number(alert.previous_cost) > 0
        ? Number(alert.new_cost) / Number(alert.previous_cost)
        : 1;
    const newPrice = Math.round(Number(alert.current_price) * ratio * 100) / 100;

    // 铁律 1：只覆盖商品当前价；历史成交价保留在订单行，改价由触发器留痕。
    const { error: priceError } = await supabase
      .from("products")
      .update({ current_price: newPrice })
      .eq("id", alert.product_id);
    if (priceError) throw priceError;
    const { error: historyError } = await supabase
      .from("price_history")
      .update({
        reason: "cost_alert_reprice",
        related_batch_id: alert.new_batch_id,
      })
      .eq("product_id", alert.product_id)
      .eq("new_price", newPrice)
      .order("created_at", { ascending: false })
      .limit(1);
    if (historyError) throw historyError;
    const { error } = await supabase
      .from("price_change_alerts")
      .update({
        status: "repriced",
        handled_by: user.id,
        handled_at: new Date().toISOString(),
      })
      .eq("id", alertId)
      .eq("status", "open");
    if (error) throw error;
    revalidatePath("/purchasing/price-alerts");
    revalidatePath("/master-data/products");
    return { ok: true as const, newPrice };
  } catch (error) {
    return failure(error);
  }
}
