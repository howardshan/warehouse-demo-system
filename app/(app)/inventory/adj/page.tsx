import Link from "next/link";
import {
  listInventoryAdjustments,
  listStock,
} from "@/app/actions/inventory";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { StockAdjustForm } from "./adj-form";

export default async function InventoryAdjPage() {
  const [stock, adjustments] = await Promise.all([
    listStock(),
    listInventoryAdjustments(),
  ]);

  const supabase = await createClient();
  const userIds = [
    ...new Set(
      adjustments.map((a) => a.created_by).filter(Boolean) as string[],
    ),
  ];
  const nameMap = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.full_name || p.id.slice(0, 8));
    }
  }

  const options = stock.map((row) => {
    const location = Array.isArray(row.locations)
      ? row.locations[0]
      : row.locations;
    const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches;
    const product =
      batch &&
      (Array.isArray(batch.products) ? batch.products[0] : batch.products);
    return {
      id: row.id,
      label: `${product?.sku ?? "—"} · ${product?.name ?? "—"} · ${location?.code ?? "—"} · LOT ${batch?.lot_no ?? "—"} · ${row.qty_units}件`,
      qty_units: Number(row.qty_units),
      qty_weight_lb: Number(row.qty_weight_lb),
      allocated_units: Number(row.allocated_units),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/inventory/stock"
          className="text-sm text-teal-800 hover:underline"
        >
          ← 查看库存
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">库存调整 (ADJ)</h1>
        <p className="mt-1 text-sm text-stone-500">
          盘点差异、损耗等在此改数；每次调整写入调整单与系统操作日志。
        </p>
      </div>

      <StockAdjustForm stocks={options} />

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-4 py-3 font-semibold">
          最近调整记录
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">商品</th>
              <th className="px-4 py-3">储位 / LOT</th>
              <th className="px-4 py-3">件数</th>
              <th className="px-4 py-3">重量 lb</th>
              <th className="px-4 py-3">原因</th>
              <th className="px-4 py-3">操作人</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((adj) => {
              const product = Array.isArray(adj.products)
                ? adj.products[0]
                : adj.products;
              const location = Array.isArray(adj.locations)
                ? adj.locations[0]
                : adj.locations;
              const batch = Array.isArray(adj.batches)
                ? adj.batches[0]
                : adj.batches;
              return (
                <tr key={adj.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {new Date(adj.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    {product?.name}
                    <div className="font-mono text-xs text-stone-400">
                      {product?.sku}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {location?.code}
                    <div className="text-stone-400">LOT {batch?.lot_no}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {adj.before_units} → {adj.after_units}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {adj.before_weight_lb} → {adj.after_weight_lb}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{adj.variance_reason}</Badge>
                    {adj.notes && (
                      <div className="mt-1 text-xs text-stone-500">
                        {adj.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {adj.created_by
                      ? (nameMap.get(adj.created_by) ?? "—")
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {!adjustments.length && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-stone-400"
                >
                  暂无调整记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
