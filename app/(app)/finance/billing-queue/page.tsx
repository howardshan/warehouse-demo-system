import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function BillingQueuePage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("v_billing_queue")
    .select("shipping_list_id, sl_number, sales_order_id, customer_id, signed_at, weight_complete, billable_amount")
    .order("signed_at");
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">开票队列</h1><p className="mt-1 text-sm text-stone-500">来源于已签收且待开票发运单；称重品按实重计价。</p></div>
    <Card><CardHeader><h2 className="font-semibold">待开票</h2></CardHeader><CardBody>
      <div className="space-y-2">{(rows ?? []).map((row) => <div key={row.shipping_list_id} className="grid items-center gap-3 border-b border-stone-100 py-3 text-sm md:grid-cols-4"><span className="font-mono text-teal-800">{row.sl_number}</span><span>{row.signed_at?.slice(0, 10)}</span><span><Badge tone={row.weight_complete ? "ok" : "danger"}>{row.weight_complete ? "重量完整" : "缺少实重"}</Badge></span><span className="text-right font-semibold tabular-nums">{formatMoney(Number(row.billable_amount))}</span></div>)}</div>
      {!rows?.length && <p className="text-sm text-stone-400">开票队列为空</p>}
    </CardBody></Card>
  </div>;
}
