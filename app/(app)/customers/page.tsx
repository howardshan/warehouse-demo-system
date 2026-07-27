import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

function creditTone(status: string) {
  if (status === "ok") return "ok" as const;
  if (status === "warning") return "warn" as const;
  return "danger" as const;
}

export default async function CustomersPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select(
      "id, code, name, credit_limit, payment_terms_days, credit_status, sales_permit_expiry, delivery_route, is_active",
    )
    .order("code");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t(messages, "pg.customers.customersTitle")}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.customers.customersHint")}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t(messages, "pg.customers.code")}</th>
              <th className="px-4 py-3 font-medium">{t(messages, "pg.customers.name")}</th>
              <th className="px-4 py-3 font-medium">{t(messages, "pg.customers.creditLimit")}</th>
              <th className="px-4 py-3 font-medium">{t(messages, "pg.customers.paymentTerms")}</th>
              <th className="px-4 py-3 font-medium">{t(messages, "pg.customers.creditStatus")}</th>
              <th className="px-4 py-3 font-medium">{t(messages, "pg.customers.permitExpiry")}</th>
              <th className="px-4 py-3 font-medium">{t(messages, "pg.customers.route")}</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c) => (
              <tr key={c.id} className="border-t border-stone-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/customers/${c.id}`}
                    className="font-mono text-xs text-teal-800 hover:underline"
                  >
                    {c.code}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3 tabular-nums">
                  {formatMoney(Number(c.credit_limit))}
                </td>
                <td className="px-4 py-3">
                  {c.payment_terms_days === 0
                    ? "COD"
                    : `Net ${c.payment_terms_days}`}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={creditTone(c.credit_status)}>
                    {c.credit_status}
                  </Badge>
                </td>
                <td className="px-4 py-3">{c.sales_permit_expiry ?? "—"}</td>
                <td className="px-4 py-3">{c.delivery_route ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
