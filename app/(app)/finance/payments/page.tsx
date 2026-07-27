import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/utils";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  const [{ data: slRows }, { data: prepaid }, { data: customers }] =
    await Promise.all([
      supabase
        .from("v_sl_payment")
        .select("customer_id, due_amount, balance_amount, pay_status"),
      supabase.from("v_customer_prepaid").select("customer_id, prepaid_balance"),
      supabase.from("customers").select("id, code, name"),
    ]);

  const prepaidMap = new Map(
    (prepaid ?? []).map((r) => [r.customer_id, Number(r.prepaid_balance)]),
  );
  const custMap = new Map((customers ?? []).map((c) => [c.id, c]));

  type Agg = {
    customerId: string;
    orders: number;
    unpaidOrders: number;
    due: number;
    balance: number;
  };
  const agg = new Map<string, Agg>();
  for (const r of slRows ?? []) {
    const a =
      agg.get(r.customer_id) ??
      ({
        customerId: r.customer_id,
        orders: 0,
        unpaidOrders: 0,
        due: 0,
        balance: 0,
      } as Agg);
    a.orders += 1;
    a.due += Number(r.due_amount);
    a.balance += Number(r.balance_amount);
    if (r.pay_status !== "paid") a.unpaidOrders += 1;
    agg.set(r.customer_id, a);
  }
  const rows = [...agg.values()].sort((x, y) => y.balance - x.balance);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.payments.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.payments.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">{t(messages, "pg.payments.byCustomer")}</h2>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t(messages, "pg.payments.customer")}</th>
                <th className="px-4 py-3 text-right font-medium">{t(messages, "pg.payments.orders")}</th>
                <th className="px-4 py-3 text-right font-medium">{t(messages, "pg.payments.due")}</th>
                <th className="px-4 py-3 text-right font-medium">{t(messages, "pg.payments.unpaidTotal")}</th>
                <th className="px-4 py-3 text-right font-medium">{t(messages, "pg.payments.prepaidBalance")}</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const c = custMap.get(r.customerId);
                const bal = prepaidMap.get(r.customerId) ?? 0;
                return (
                  <tr key={r.customerId} className="border-t border-stone-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/finance/payments/${r.customerId}`}
                        className="font-medium text-teal-800 hover:underline"
                      >
                        {c ? `${c.code} · ${c.name}` : r.customerId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.orders}
                      {r.unpaidOrders > 0 && (
                        <span className="ml-1 text-xs text-amber-700">
                          ({r.unpaidOrders} {t(messages, "pg.payments.unpaidShort")})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                      {formatMoney(r.due)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {r.balance > 0 ? (
                        <span className="text-red-600">{formatMoney(r.balance)}</span>
                      ) : (
                        <Badge tone="ok">{t(messages, "pg.payments.cleared")}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-teal-700">
                      {formatMoney(bal)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/finance/payments/${r.customerId}`}
                        className="text-sm text-teal-800 hover:underline"
                      >
                        {t(messages, "pg.payments.manage")} →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                    {t(messages, "pg.payments.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
