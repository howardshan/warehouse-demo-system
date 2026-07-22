"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ReplenishmentInput = {
  product_id: string;
  to_location_id?: string | null;
  qty_units: number;
  qty_weight_lb: number;
  reason?: string | null;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return { supabase };
}

function failure(error: unknown) {
  return {
    ok: false as const,
    error: error instanceof Error ? error.message : String(error),
  };
}

export async function createReplenishmentTask(input: ReplenishmentInput) {
  try {
    const { supabase } = await requireUser();
    const qtyUnits = Number(input.qty_units);
    const qtyWeight = Number(input.qty_weight_lb);
    if (qtyUnits < 0 || qtyWeight < 0 || (qtyUnits === 0 && qtyWeight === 0)) {
      throw new Error("补货数量必须大于零");
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("fixed_pick_location_id")
      .eq("id", input.product_id)
      .single();
    if (productError) throw productError;
    const toLocationId = input.to_location_id || product.fixed_pick_location_id;
    if (!toLocationId) throw new Error("商品未设置固定拣货位");

    const { data: candidates, error: candidatesError } = await supabase
      .from("stock")
      .select(
        "location_id, batch_id, qty_units, qty_weight_lb, locations!inner(type), batches!inner(product_id, status, expiry_date, received_at)",
      )
      .eq("locations.type", "reserve")
      .eq("batches.product_id", input.product_id)
      .eq("batches.status", "available")
      .or("qty_units.gt.0,qty_weight_lb.gt.0");
    if (candidatesError) throw candidatesError;

    // 铁律 7：补货时执行 FEFO；无效期批次排在有明确效期批次之后。
    const sorted = (candidates ?? []).sort((a, b) => {
      const batchA = Array.isArray(a.batches) ? a.batches[0] : a.batches;
      const batchB = Array.isArray(b.batches) ? b.batches[0] : b.batches;
      const expiryA = batchA?.expiry_date || "9999-12-31";
      const expiryB = batchB?.expiry_date || "9999-12-31";
      return expiryA.localeCompare(expiryB);
    });
    const source = sorted.find(
      (row) =>
        Number(row.qty_units) >= qtyUnits &&
        Number(row.qty_weight_lb) >= qtyWeight,
    );
    if (!source) throw new Error("存储位没有单一 FEFO 批次可满足本次补货数量");

    const { data: pickStock, error: pickStockError } = await supabase
      .from("stock")
      .select("batch_id, qty_units, qty_weight_lb")
      .eq("location_id", toLocationId)
      .or("qty_units.gt.0,qty_weight_lb.gt.0")
      .maybeSingle();
    if (pickStockError) throw pickStockError;
    if (pickStock && pickStock.batch_id !== source.batch_id) {
      throw new Error("拣货位尚有另一批次库存，不能混放");
    }

    const { data, error } = await supabase
      .from("replenishment_tasks")
      .insert({
        product_id: input.product_id,
        batch_id: source.batch_id,
        from_location_id: source.location_id,
        to_location_id: toLocationId,
        qty_units: qtyUnits,
        qty_weight_lb: qtyWeight,
        reason: input.reason || "FEFO 补货",
      })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/inventory/replenishment");
    return { ok: true as const, id: data.id };
  } catch (error) {
    return failure(error);
  }
}

export async function completeReplenishment(taskId: string) {
  try {
    const { supabase } = await requireUser();
    const { data: task, error: taskError } = await supabase
      .from("replenishment_tasks")
      .select("*")
      .eq("id", taskId)
      .single();
    if (taskError) throw taskError;
    if (!["open", "in_progress"].includes(task.status)) {
      throw new Error("该补货任务不可完成");
    }

    const { data: source, error: sourceError } = await supabase
      .from("stock")
      .select("id, qty_units, qty_weight_lb, allocated_units, allocated_weight_lb")
      .eq("location_id", task.from_location_id)
      .eq("batch_id", task.batch_id)
      .single();
    if (sourceError) throw sourceError;
    const availableUnits = Number(source.qty_units) - Number(source.allocated_units);
    const availableWeight =
      Number(source.qty_weight_lb) - Number(source.allocated_weight_lb);
    if (
      availableUnits < Number(task.qty_units) ||
      availableWeight < Number(task.qty_weight_lb)
    ) {
      throw new Error("源储位可用库存不足");
    }

    const { data: destination, error: destinationError } = await supabase
      .from("stock")
      .select("id, qty_units, qty_weight_lb")
      .eq("location_id", task.to_location_id)
      .eq("batch_id", task.batch_id)
      .maybeSingle();
    if (destinationError) throw destinationError;
    const { error: sourceUpdateError } = await supabase
      .from("stock")
      .update({
        qty_units: Number(source.qty_units) - Number(task.qty_units),
        qty_weight_lb:
          Number(source.qty_weight_lb) - Number(task.qty_weight_lb),
      })
      .eq("id", source.id);
    if (sourceUpdateError) throw sourceUpdateError;

    const destinationMutation = destination
      ? supabase
          .from("stock")
          .update({
            qty_units: Number(destination.qty_units) + Number(task.qty_units),
            qty_weight_lb:
              Number(destination.qty_weight_lb) + Number(task.qty_weight_lb),
          })
          .eq("id", destination.id)
      : supabase.from("stock").insert({
          location_id: task.to_location_id,
          batch_id: task.batch_id,
          qty_units: task.qty_units,
          qty_weight_lb: task.qty_weight_lb,
        });
    const { error: destinationMutationError } = await destinationMutation;
    if (destinationMutationError) {
      await supabase
        .from("stock")
        .update({
          qty_units: source.qty_units,
          qty_weight_lb: source.qty_weight_lb,
        })
        .eq("id", source.id);
      throw destinationMutationError;
    }

    const { error } = await supabase
      .from("replenishment_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", taskId);
    if (error) throw error;
    revalidatePath("/inventory/replenishment");
    revalidatePath("/inventory/stock");
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
}

export async function listBatches() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("batches")
    .select(
      "id, origin, lot_no, expiry_date, unit_cost, status, received_at, created_at, products(sku, name)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listStock() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("stock")
    .select(
      "id, qty_units, qty_weight_lb, allocated_units, allocated_weight_lb, locations(code, type, temp_zone), batches(lot_no, expiry_date, status, products(id, sku, name))",
    )
    .or("qty_units.gt.0,qty_weight_lb.gt.0")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAtp() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("v_atp")
    .select(
      "product_id, on_hand_units, on_hand_weight_lb, allocated_units, allocated_weight_lb, atp_units, atp_weight_lb",
    );
  if (error) return [];
  return data ?? [];
}

export type StockAdjustInput = {
  stock_id: string;
  after_units: number;
  after_weight_lb: number;
  variance_reason: string;
  notes?: string | null;
};

/** 库存调整(ADJ)：改写在手量，必须登记差异原因；写入 inventory_adjustments + stock（触发器留痕） */
export async function adjustStock(input: StockAdjustInput) {
  try {
    const { supabase } = await requireUser();
    const afterUnits = Number(input.after_units);
    const afterWeight = Number(input.after_weight_lb);
    if (!Number.isFinite(afterUnits) || afterUnits < 0) {
      throw new Error("调整后件数必须为非负数");
    }
    if (!Number.isFinite(afterWeight) || afterWeight < 0) {
      throw new Error("调整后重量必须为非负数");
    }
    if (!input.variance_reason) {
      throw new Error("库存调整必须选择差异原因");
    }

    const { data: row, error: loadErr } = await supabase
      .from("stock")
      .select(
        "id, location_id, batch_id, qty_units, qty_weight_lb, allocated_units, allocated_weight_lb, batches!inner(product_id)",
      )
      .eq("id", input.stock_id)
      .single();
    if (loadErr) throw loadErr;

    const beforeUnits = Number(row.qty_units);
    const beforeWeight = Number(row.qty_weight_lb);
    if (beforeUnits === afterUnits && beforeWeight === afterWeight) {
      throw new Error("调整前后数量相同，无需保存");
    }
    if (afterUnits < Number(row.allocated_units)) {
      throw new Error(
        `调整后件数 ${afterUnits} 低于已占用 ${row.allocated_units}，请先释放预留`,
      );
    }
    if (afterWeight < Number(row.allocated_weight_lb)) {
      throw new Error(`调整后重量低于已占用重量，请先释放预留`);
    }

    const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches;
    const productId = (batch as { product_id?: string } | null)?.product_id;
    if (!productId) throw new Error("库存行缺少商品");

    const { data: adj, error: adjErr } = await supabase
      .from("inventory_adjustments")
      .insert({
        stock_id: row.id,
        product_id: productId,
        location_id: row.location_id,
        batch_id: row.batch_id,
        before_units: beforeUnits,
        before_weight_lb: beforeWeight,
        after_units: afterUnits,
        after_weight_lb: afterWeight,
        variance_reason: input.variance_reason,
        notes: input.notes || null,
      })
      .select("id")
      .single();
    if (adjErr) throw adjErr;

    const { error: stockErr } = await supabase
      .from("stock")
      .update({
        qty_units: afterUnits,
        qty_weight_lb: afterWeight,
      })
      .eq("id", row.id);
    if (stockErr) {
      await supabase.from("inventory_adjustments").delete().eq("id", adj.id);
      throw stockErr;
    }

    // 数量归零时可标记批次耗尽（非强制）
    if (afterUnits === 0 && afterWeight === 0) {
      const { data: remaining } = await supabase
        .from("stock")
        .select("id")
        .eq("batch_id", row.batch_id)
        .or("qty_units.gt.0,qty_weight_lb.gt.0")
        .limit(1);
      if (!remaining?.length) {
        await supabase
          .from("batches")
          .update({ status: "depleted" })
          .eq("id", row.batch_id)
          .eq("status", "available");
      }
    }

    revalidatePath("/inventory/stock");
    revalidatePath("/inventory/adj");
    revalidatePath("/it/audit-log");
    return { ok: true as const, id: adj.id };
  } catch (error) {
    return failure(error);
  }
}

export async function listInventoryAdjustments() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("inventory_adjustments")
    .select(
      "id, before_units, before_weight_lb, after_units, after_weight_lb, variance_reason, notes, created_at, created_by, products(sku, name), locations(code), batches(lot_no)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listAuditLog(opts?: {
  tableName?: string | null;
  limit?: number;
}) {
  const { supabase } = await requireUser();
  let query = supabase
    .from("audit_log")
    .select(
      "id, table_name, record_id, action, changed_by, old_values, new_values, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);
  if (opts?.tableName) {
    query = query.eq("table_name", opts.tableName);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
