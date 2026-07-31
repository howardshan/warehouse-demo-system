import Link from "next/link";
import { notFound } from "next/navigation";
import { creditCheckAndReleaseShipping, signShippingList } from "@/app/actions/warehouse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function ShippingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: shipping }, { data: lines }] = await Promise.all([
    supabase.from("shipping_lists").select("*, sales_orders(so_number, customer_name_snapshot, delivery_address_snapshot)").eq("id", id).maybeSingle(),
    supabase.from("sl_lines").select("*, products(sku, name), batches(lot_no)").eq("shipping_list_id", id).order("line_no"),
  ]);
  if (!shipping) notFound();
  const order = shipping.sales_orders as unknown as { so_number: string; customer_name_snapshot: string; delivery_address_snapshot: string };
  const total = (lines ?? []).reduce((sum, line) => sum + Number(line.is_catch_weight_snapshot ? line.shipped_weight_lb : line.shipped_units) * Number(line.unit_price), 0);
  return <div className="space-y-6">
    <div><Link href="/warehouse/shipping" className="text-sm text-teal-800 hover:underline">← {t(messages, "pg.warehouse.backToShippingList")}</Link><div className="mt-2 flex items-center gap-3"><h1 className="text-2xl font-semibold">{shipping.sl_number}</h1><Badge>{shipping.status}</Badge></div><p className="mt-1 text-sm text-stone-500"><span className="text-stone-400">{t(messages, "pg.warehouse.orderNoLabel")}:</span> {order.so_number} · {order.customer_name_snapshot} · {order.delivery_address_snapshot}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.warehouse.shippingDetail")}</h2></CardHeader><CardBody>
      <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
          <tr><th className="py-2 pr-4 font-medium">{t(messages, "pg.warehouse.colProduct")}</th><th className="py-2 pr-4 font-medium">{t(messages, "pg.warehouse.colBatch")}</th><th className="py-2 pr-4 text-right font-medium">{t(messages, "pg.warehouse.colQtyWeight")}</th><th className="py-2 pr-4 text-right font-medium">{t(messages, "pg.warehouse.colUnitPrice")}</th><th className="py-2 text-right font-medium">{t(messages, "pg.warehouse.colLineTotal")}</th></tr>
        </thead>
        <tbody>{(lines ?? []).map((line) => {
          const product = line.products as unknown as { sku: string; name: string };
          const batch = line.batches as unknown as { lot_no: string };
          const cw = line.is_catch_weight_snapshot;
          const lineTotal = Number(cw ? line.shipped_weight_lb : line.shipped_units) * Number(line.unit_price);
          return <tr key={line.id} className="border-b border-stone-100"><td className="py-2 pr-4"><span className="font-mono text-xs text-stone-500">{product.sku}</span> · {product.name}</td><td className="py-2 pr-4 font-mono text-xs text-stone-500">{batch.lot_no}</td><td className="py-2 pr-4 text-right tabular-nums">{Number(line.shipped_units)} 件{line.shipped_weight_lb != null ? ` / ${line.shipped_weight_lb} lb` : ""}</td><td className="py-2 pr-4 text-right tabular-nums">{formatMoney(Number(line.unit_price))}{cw ? " /lb" : ""}</td><td className="py-2 text-right font-medium tabular-nums">{formatMoney(lineTotal)}</td></tr>;
        })}</tbody>
      </table></div>
      <div className="mt-4 text-right font-semibold">{t(messages, "pg.warehouse.estimatedReceivable").replace("{x}", formatMoney(total))}</div>
    </CardBody></Card>
    {["ready", "draft"].includes(shipping.status) && <form action={creditCheckAndReleaseShipping.bind(null, id)}><Button type="submit">{t(messages, "pg.warehouse.creditCheckAndRelease")}</Button></form>}
    {["released", "in_transit"].includes(shipping.status) && <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.warehouse.podTitle")}</h2></CardHeader><CardBody>
      <form action={signShippingList.bind(null, id)} className="grid gap-4 md:grid-cols-2"><div><Label>{t(messages, "pg.warehouse.signerName")}</Label><Input name="signed_by_name" required /></div><div><Label>{t(messages, "pg.warehouse.podFileUrl")}</Label><Input name="proof_url" type="url" placeholder="https://..." /></div><div className="md:col-span-2"><Button type="submit">{t(messages, "pg.warehouse.confirmPodCloseOrder")}</Button></div></form>
    </CardBody></Card>}
    {shipping.status === "signed" && <Card><CardBody><div className="text-sm"><span className="text-stone-500">{t(messages, "pg.warehouse.signerLabel")}</span>{shipping.signed_by_name}　<span className="text-stone-500">{t(messages, "pg.warehouse.signedAtLabel")}</span>{shipping.signed_at}</div></CardBody></Card>}
  </div>;
}
