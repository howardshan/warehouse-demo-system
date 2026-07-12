import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { IssuePoButton, PoLineForm } from "../../purchasing-forms";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: order }, { data: lines }, { data: products }] = await Promise.all([
    supabase.from("purchase_orders").select("*, suppliers(name)").eq("id", id).maybeSingle(),
    supabase.from("po_lines").select("*, products(sku, name, ordering_uom)").eq("purchase_order_id", id).order("line_no"),
    supabase.from("products").select("id, sku, name").eq("is_active", true).order("sku"),
  ]);
  if (!order) notFound();
  const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">{order.po_number}</h1><p className="mt-1 text-sm text-stone-500">{supplier?.name ?? "—"} · {order.order_date} · {order.currency_code}</p></div>
        <Badge tone={order.status === "draft" ? "neutral" : order.status === "received" ? "ok" : "warn"}>{order.status}</Badge>
      </div>
      {order.status === "draft" && <Card><CardHeader><h2 className="text-lg font-semibold">添加采购明细</h2></CardHeader><CardBody><PoLineForm poId={id} products={(products ?? []).map((product) => ({ id: product.id, label: `${product.sku} · ${product.name}` }))} /></CardBody></Card>}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">行</th><th className="px-4 py-3">商品</th><th className="px-4 py-3">订购件数</th><th className="px-4 py-3">预计重量</th><th className="px-4 py-3">单位成本</th><th className="px-4 py-3">已收件数</th></tr></thead>
          <tbody>
            {(lines ?? []).map((line) => {
              const product = Array.isArray(line.products) ? line.products[0] : line.products;
              return <tr key={line.id} className="border-t border-stone-100"><td className="px-4 py-3">{line.line_no}</td><td className="px-4 py-3">{product?.name}<div className="font-mono text-xs text-stone-400">{product?.sku}</div></td><td className="px-4 py-3 tabular-nums">{line.qty_units} {product?.ordering_uom}</td><td className="px-4 py-3 tabular-nums">{line.estimated_weight_lb ?? "—"}</td><td className="px-4 py-3 tabular-nums">{formatMoney(Number(line.unit_cost))}</td><td className="px-4 py-3 tabular-nums">{line.received_units}</td></tr>;
            })}
            {!lines?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">尚未添加明细</td></tr>}
          </tbody>
        </table>
      </div>
      {order.status === "draft" && <IssuePoButton poId={id} />}
    </div>
  );
}
