import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function CreditControlPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: rows }, { data: customers }] = await Promise.all([
    supabase.from("v_credit_exposure").select(
      "customer_id, credit_limit, credit_status, open_order_exposure, signed_uninvoiced_exposure, exposure, available_credit",
    ).order("available_credit"),
    supabase.from("customers").select("id, code, name"),
  ]);
  const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer]));
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.finance.creditControlTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.finance.creditControlHint")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.finance.creditExposure")}</h2></CardHeader><CardBody className="overflow-x-auto">
      <table className="w-full text-left text-sm"><thead className="text-stone-500"><tr><th className="py-2">{t(messages, "pg.finance.customer")}</th><th className="py-2 text-right">{t(messages, "pg.finance.creditLimit")}</th><th className="py-2 text-right">{t(messages, "pg.finance.openOrders")}</th><th className="py-2 text-right">{t(messages, "pg.finance.signedUninvoiced")}</th><th className="py-2 text-right">{t(messages, "pg.finance.totalExposure")}</th><th className="py-2 text-right">{t(messages, "pg.finance.available")}</th><th className="py-2 text-right">{t(messages, "pg.finance.status")}</th></tr></thead>
      <tbody>{(rows ?? []).map((row) => {
        const customer = customerById.get(row.customer_id);
        const available = Number(row.available_credit);
        const limit = Number(row.credit_limit);
        const tone = available < 0 ? "danger" : available < limit * 0.2 ? "warn" : "ok";
        return <tr key={row.customer_id} className="border-t border-stone-100"><td className="py-3">{customer ? `${customer.code} · ${customer.name}` : row.customer_id}</td><td className="py-3 text-right">{formatMoney(limit)}</td><td className="py-3 text-right">{formatMoney(Number(row.open_order_exposure))}</td><td className="py-3 text-right">{formatMoney(Number(row.signed_uninvoiced_exposure))}</td><td className="py-3 text-right font-semibold">{formatMoney(Number(row.exposure))}</td><td className="py-3 text-right">{formatMoney(available)}</td><td className="py-3 text-right"><Badge tone={tone}>{row.credit_status}</Badge></td></tr>;
      })}</tbody></table>
    </CardBody></Card>
  </div>;
}
