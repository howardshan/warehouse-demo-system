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

export default async function ShippingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: shipping }, { data: lines }] = await Promise.all([
    supabase.from("shipping_lists").select("*, sales_orders(so_number, customer_name_snapshot, delivery_address_snapshot)").eq("id", id).maybeSingle(),
    supabase.from("sl_lines").select("*, products(code, name), batches(lot_no)").eq("shipping_list_id", id).order("line_no"),
  ]);
  if (!shipping) notFound();
  const order = shipping.sales_orders as unknown as { so_number: string; customer_name_snapshot: string; delivery_address_snapshot: string };
  const total = (lines ?? []).reduce((sum, line) => sum + Number(line.is_catch_weight_snapshot ? line.shipped_weight_lb : line.shipped_units) * Number(line.unit_price), 0);
  return <div className="space-y-6">
    <div><Link href="/warehouse/shipping" className="text-sm text-teal-800 hover:underline">← 发运列表</Link><div className="mt-2 flex items-center gap-3"><h1 className="text-2xl font-semibold">{shipping.sl_number}</h1><Badge>{shipping.status}</Badge></div><p className="mt-1 text-sm text-stone-500">{order.so_number} · {order.customer_name_snapshot} · {order.delivery_address_snapshot}</p></div>
    <Card><CardHeader><h2 className="font-semibold">发运明细</h2></CardHeader><CardBody>
      <div className="space-y-2">{(lines ?? []).map((line) => {
        const product = line.products as unknown as { code: string; name: string };
        const batch = line.batches as unknown as { lot_no: string };
        return <div key={line.id} className="grid grid-cols-4 border-b border-stone-100 py-2 text-sm"><span>{product.code} · {product.name}</span><span>批号 {batch.lot_no}</span><span>{line.shipped_units} 件{line.shipped_weight_lb != null ? ` / ${line.shipped_weight_lb} lb` : ""}</span><span className="text-right">{formatMoney(Number(line.unit_price))}</span></div>;
      })}</div>
      <div className="mt-4 text-right font-semibold">预计应收 {formatMoney(total)}</div>
    </CardBody></Card>
    {["ready", "draft"].includes(shipping.status) && <form action={creditCheckAndReleaseShipping.bind(null, id)}><Button type="submit">信用复核并放行装车</Button></form>}
    {["released", "in_transit"].includes(shipping.status) && <Card><CardHeader><h2 className="font-semibold">签收回单（POD）</h2></CardHeader><CardBody>
      <form action={signShippingList.bind(null, id)} className="grid gap-4 md:grid-cols-2"><div><Label>签收人姓名</Label><Input name="signed_by_name" required /></div><div><Label>POD 文件 URL</Label><Input name="proof_url" type="url" placeholder="https://..." /></div><div className="md:col-span-2"><Button type="submit">确认签收并关闭订单</Button></div></form>
    </CardBody></Card>}
    {shipping.status === "signed" && <Card><CardBody><div className="text-sm"><span className="text-stone-500">签收人：</span>{shipping.signed_by_name}　<span className="text-stone-500">签收时间：</span>{shipping.signed_at}</div></CardBody></Card>}
  </div>;
}
