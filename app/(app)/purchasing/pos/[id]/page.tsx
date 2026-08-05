import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { statusLabel } from "@/lib/i18n/status";
import { formatMoney } from "@/lib/utils";
import {
  DeletePoLineButton,
  IssuePoButton,
  PoLineForm,
} from "../../purchasing-forms";

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
    })
    // 在服务端排序一次，客户端按此顺序渲染，避免 hydration 失配
    .sort((a, b) =>
      (a.family_name ?? a.name).localeCompare(b.family_name ?? b.name, "zh-Hans-CN"),
    );

  return (
    <div className="space-y-6">
      <Link
        href="/purchasing/pos"
        className="inline-flex w-fit items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900"
      >
        <span aria-hidden>←</span>
        {t(messages, "pg.purchasing.backToPos")}
      </Link>
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
            <h2 className="text-lg font-semibold">{t(messages, "pg.purchasing.addPoLine")}</h2>
            <p className="text-sm text-stone-500">
              {t(messages, "pg.purchasing.addPoLineDesc")}
            </p>
          </CardHeader>
          <CardBody>
            <PoLineForm poId={id} products={productOptions} />
          </CardBody>
        </Card>
      )}

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
          <h2 className="font-semibold">
            {t(messages, "pg.purchasing.linesTitle")}
          </h2>
          <span className="rounded-full bg-stone-200/70 px-2.5 py-0.5 text-xs font-medium text-stone-600">
            {t(messages, "pg.purchasing.linesCount").replace(
              "{n}",
              String(lines?.length ?? 0),
            )}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-stone-500">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3 font-medium">
                  {t(messages, "pg.purchasing.lineNo")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t(messages, "pg.purchasing.productSku")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t(messages, "pg.purchasing.qty")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t(messages, "pg.purchasing.unit")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t(messages, "pg.purchasing.estimatedWeightLb")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t(messages, "pg.purchasing.unitPrice")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t(messages, "pg.purchasing.received")}
                </th>
                {order.status === "draft" && (
                  <th className="px-4 py-3 text-right font-medium">
                    {t(messages, "pg.purchasing.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(lines ?? []).map((line) => {
                const product = Array.isArray(line.products)
                  ? line.products[0]
                  : line.products;
                return (
                  <tr
                    key={line.id}
                    className="border-b border-stone-100 last:border-0 even:bg-stone-50/40"
                  >
                    <td className="px-4 py-3 text-stone-400">{line.line_no}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-800">
                        {product?.name}
                      </div>
                      <div className="font-mono text-xs text-stone-400">
                        {product?.sku}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {line.qty_units}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {product?.ordering_uom}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {line.estimated_weight_lb ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(Number(line.unit_cost))}
                      {product?.pricing_uom ? (
                        <span className="text-stone-400">{` / ${product.pricing_uom}`}</span>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {line.received_units}
                    </td>
                    {order.status === "draft" && (
                      <td className="px-4 py-3 text-right">
                        <DeletePoLineButton poLineId={line.id} poId={id} />
                      </td>
                    )}
                  </tr>
                );
              })}
              {!lines?.length && (
                <tr>
                  <td
                    colSpan={order.status === "draft" ? 8 : 7}
                    className="px-4 py-10 text-center text-stone-400"
                  >
                    {t(messages, "pg.purchasing.noLines")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {order.status === "draft" && (
        <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-500">
            {t(messages, "pg.purchasing.issueHint")}
          </p>
          <IssuePoButton poId={id} />
        </div>
      )}
    </div>
  );
}
