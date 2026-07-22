import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { statusLabel } from "@/lib/i18n/status";
import { formatMoney } from "@/lib/utils";
import { IssuePoButton, PoLineForm } from "../../purchasing-forms";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: order }, { data: lines }, { data: products }] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*, suppliers(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("po_lines")
      .select("*, products(sku, name, ordering_uom, pricing_uom)")
      .eq("purchase_order_id", id)
      .order("line_no"),
    supabase
      .from("products")
      .select(
        "id, sku, name, ordering_uom, pricing_uom, current_price, is_catch_weight, avg_weight_lb, pack_contains_qty, family_id, is_purchasable, product_families!inner(code, name, purchase_uom, supplier_id)",
      )
      .eq("is_active", true)
      .eq("is_purchasable", true)
      .order("sku"),
  ]);
  if (!order) notFound();
  const supplier = Array.isArray(order.suppliers)
    ? order.suppliers[0]
    : order.suppliers;

  const productOptions = (products ?? [])
    .filter((product) => {
      const family = Array.isArray(product.product_families)
        ? product.product_families[0]
        : product.product_families;
      // 只可选本 PO 供应商下的原产品包装；未绑供应商的历史数据仍可见
      return (
        !family?.supplier_id || family.supplier_id === order.supplier_id
      );
    })
    .map((product) => {
      const family = Array.isArray(product.product_families)
        ? product.product_families[0]
        : product.product_families;
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        ordering_uom: product.ordering_uom,
        pricing_uom: product.pricing_uom,
        current_price: Number(product.current_price),
        is_catch_weight: product.is_catch_weight,
        avg_weight_lb:
          product.avg_weight_lb == null ? null : Number(product.avg_weight_lb),
        pack_contains_qty: Number(product.pack_contains_qty ?? 1),
        family_id: product.family_id,
        family_code: family?.code ?? null,
        family_name: family?.name ?? null,
        family_purchase_uom: family?.purchase_uom ?? null,
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{order.po_number}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {supplier?.name ?? "—"} · {order.order_date} · {order.currency_code}
          </p>
        </div>
        <Badge
          tone={
            order.status === "draft"
              ? "neutral"
              : order.status === "received"
                ? "ok"
                : "warn"
          }
        >
          {statusLabel(messages, "po", order.status)}
        </Badge>
      </div>

      {order.status === "draft" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">添加采购明细</h2>
            <p className="text-sm text-stone-500">
              按本单供应商下的原产品采购包装下单。同一商品不同供应商请在「原产品」分别建档；销售拆包与卖价在商品主数据维护。
            </p>
          </CardHeader>
          <CardBody>
            <PoLineForm poId={id} products={productOptions} />
          </CardBody>
        </Card>
      )}

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">行</th>
              <th className="px-4 py-3">商品 / SKU</th>
              <th className="px-4 py-3">数量</th>
              <th className="px-4 py-3">单位</th>
              <th className="px-4 py-3">预计重量 lb</th>
              <th className="px-4 py-3">单价</th>
              <th className="px-4 py-3">已收</th>
            </tr>
          </thead>
          <tbody>
            {(lines ?? []).map((line) => {
              const product = Array.isArray(line.products)
                ? line.products[0]
                : line.products;
              return (
                <tr key={line.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">{line.line_no}</td>
                  <td className="px-4 py-3">
                    {product?.name}
                    <div className="font-mono text-xs text-stone-400">
                      {product?.sku}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{line.qty_units}</td>
                  <td className="px-4 py-3">{product?.ordering_uom}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {line.estimated_weight_lb ?? "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(Number(line.unit_cost))}
                    {product?.pricing_uom ? ` / ${product.pricing_uom}` : ""}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {line.received_units}
                  </td>
                </tr>
              );
            })}
            {!lines?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                  尚未添加明细
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {order.status === "draft" && <IssuePoButton poId={id} />}
    </div>
  );
}
