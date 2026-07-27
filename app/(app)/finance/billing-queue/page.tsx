import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function BillingQueuePage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: rows } = await supabase.from("v_billing_queue")
    .select("shipping_list_id, sl_number, sales_order_id, customer_id, signed_at, weight_complete, billable_amount")
    .order("signed_at");
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.finance.billingQueueTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.finance.billingQueueHint")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.finance.billingPending")}</h2></CardHeader><CardBody>
      <div className="space-y-2">{(rows ?? []).map((row) => <div key={row.shipping_list_id} className="grid items-center gap-3 border-b border-stone-100 py-3 text-sm md:grid-cols-4"><span className="font-mono text-teal-800">{row.sl_number}</span><span>{row.signed_at?.slice(0, 10)}</span><span><Badge tone={row.weight_complete ? "ok" : "danger"}>{row.weight_complete ? t(messages, "pg.finance.weightComplete") : t(messages, "pg.finance.weightMissing")}</Badge></span><span className="text-right font-semibold tabular-nums">{formatMoney(Number(row.billable_amount))}</span></div>)}</div>
      {!rows?.length && <p className="text-sm text-stone-400">{t(messages, "pg.finance.billingQueueEmpty")}</p>}
    </CardBody></Card>
  </div>;
}
