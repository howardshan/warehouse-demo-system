import { createClient } from "@/lib/supabase/server";
import { ProductCreateForm } from "./product-form";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export default async function ProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: locations }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, sku, name, temp_zone, is_catch_weight, ordering_uom, pricing_uom, avg_weight_lb, current_price, is_active, fixed_pick_location_id",
      )
      .order("sku"),
    supabase.from("locations").select("id, code, type").eq("is_active", true),
  ]);

  const locMap = new Map((locations ?? []).map((l) => [l.id, l.code]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">商品主数据</h1>
        <p className="mt-1 text-sm text-stone-500">
          当前价会被覆盖；历史成交价必须快照在订单行上（铁律 1，Phase 4 落地）。
        </p>
      </div>

      <ProductCreateForm locations={locations ?? []} />

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">温区</th>
              <th className="px-4 py-3 font-medium">单位</th>
              <th className="px-4 py-3 font-medium">当前价</th>
              <th className="px-4 py-3 font-medium">拣货位</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3">
                  {p.name}
                  {p.is_catch_weight && (
                    <Badge className="ml-2" tone="ok">
                      catch wt
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">{p.temp_zone}</td>
                <td className="px-4 py-3">
                  {p.ordering_uom}
                  {p.is_catch_weight ? ` → ${p.pricing_uom}` : ""}
                  {p.avg_weight_lb != null && (
                    <span className="text-stone-400">
                      {" "}
                      (~{p.avg_weight_lb} lb)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatMoney(Number(p.current_price))}
                  {p.is_catch_weight ? "/lb" : ""}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {p.fixed_pick_location_id
                    ? locMap.get(p.fixed_pick_location_id) ?? "—"
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={p.is_active ? "ok" : "neutral"}>
                    {p.is_active ? "active" : "inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
            {(products ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-stone-400"
                >
                  暂无商品。请先跑 migrations + seed，或在上方新建。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
