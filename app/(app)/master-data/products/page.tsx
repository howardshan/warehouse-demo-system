import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCreateForm } from "./product-form";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export default async function ProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: locations }, { data: families }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, sku, name, temp_zone, is_catch_weight, ordering_uom, pricing_uom, avg_weight_lb, current_price, is_active, fixed_pick_location_id, pack_contains_qty, family_id, product_families(code, name)",
        )
        .order("sku"),
      supabase.from("locations").select("id, code, type").eq("is_active", true),
      supabase
        .from("product_families")
        .select("id, code, name")
        .eq("is_active", true)
        .order("name"),
    ]);

  const locMap = new Map((locations ?? []).map((l) => [l.id, l.code]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">商品主数据</h1>
        <p className="mt-1 text-sm text-stone-500">
          原产品可对应多个包装 SKU（箱/包/lb）。售价改主档只影响新单；历史成交价快照在订单行。下架商品不可再开新单。
        </p>
      </div>

      <ProductCreateForm
        locations={locations ?? []}
        families={families ?? []}
      />

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">原产品</th>
              <th className="px-4 py-3 font-medium">销售产品名称</th>
              <th className="px-4 py-3 font-medium">订货单位</th>
              <th className="px-4 py-3 font-medium">含量</th>
              <th className="px-4 py-3 font-medium">单价</th>
              <th className="px-4 py-3 font-medium">拣货位</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => {
              const family = Array.isArray(p.product_families)
                ? p.product_families[0]
                : p.product_families;
              return (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-sm">
                    {family ? family.name : "—"}
                    {family?.code && (
                      <div className="font-mono text-xs text-stone-400">
                        {family.code}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.name}
                    {p.is_catch_weight && (
                      <Badge className="ml-2" tone="ok">
                        catch wt
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.ordering_uom}
                    {p.pricing_uom !== p.ordering_uom
                      ? ` → ${p.pricing_uom}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {p.pack_contains_qty ?? 1}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(Number(p.current_price))}/{p.pricing_uom}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {p.fixed_pick_location_id
                      ? (locMap.get(p.fixed_pick_location_id) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.is_active ? "ok" : "neutral"}>
                      {p.is_active ? "上架" : "下架"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/master-data/products/${p.id}`}
                      className="text-sm font-medium text-teal-800 hover:underline"
                    >
                      编辑
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(products ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-stone-400"
                >
                  暂无商品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
