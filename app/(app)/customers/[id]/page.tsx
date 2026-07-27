import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const [{ data: contacts }, { data: addresses }] = await Promise.all([
    supabase.from("customer_contacts").select("*").eq("customer_id", id),
    supabase.from("customer_addresses").select("*").eq("customer_id", id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/customers" className="text-sm text-teal-800 hover:underline">
          {t(messages, "pg.customers.backToList")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {customer.name}{" "}
          <span className="font-mono text-base text-stone-400">
            {customer.code}
          </span>
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t(messages, "pg.customers.creditProfile")}</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">{t(messages, "pg.customers.creditLimit")}</span>
              <span className="tabular-nums">
                {formatMoney(Number(customer.credit_limit))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{t(messages, "pg.customers.paymentTerms")}</span>
              <span>
                {customer.payment_terms_days === 0
                  ? "COD"
                  : `Net ${customer.payment_terms_days}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{t(messages, "pg.customers.status")}</span>
              <Badge>{customer.credit_status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{t(messages, "pg.customers.overdueBlockDays")}</span>
              <span>{customer.overdue_block_days}</span>
            </div>
            {customer.credit_status_note && (
              <p className="rounded bg-stone-50 p-2 text-stone-600">
                {customer.credit_status_note}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Sales Permit</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">URL</span>
              <span className="truncate">
                {customer.sales_permit_url ?? "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{t(messages, "pg.customers.validUntil")}</span>
              <span>{customer.sales_permit_expiry ?? "—"}</span>
            </div>
            <p className="text-xs text-stone-400">
              {t(messages, "pg.customers.permitHint")}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">{t(messages, "pg.customers.deliveryAddresses")}</h2>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm">
            {(addresses ?? []).map((a) => (
              <li key={a.id} className="rounded border border-stone-100 p-3">
                <div className="font-medium">
                  {a.label ?? t(messages, "pg.customers.addressLabel")}
                  {a.is_default && (
                    <Badge className="ml-2" tone="ok">
                      default
                    </Badge>
                  )}
                </div>
                <div className="text-stone-600">{a.address}</div>
                {a.delivery_window && (
                  <div className="text-xs text-stone-400">
                    {t(messages, "pg.customers.window")}: {a.delivery_window}
                  </div>
                )}
              </li>
            ))}
            {(addresses ?? []).length === 0 && (
              <li className="text-stone-400">{t(messages, "pg.customers.noAddresses")}</li>
            )}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">{t(messages, "pg.customers.contacts")}</h2>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm">
            {(contacts ?? []).map((c) => (
              <li key={c.id} className="flex justify-between border-b border-stone-50 py-2">
                <span>
                  {c.name}
                  {c.role && (
                    <span className="ml-2 text-stone-400">({c.role})</span>
                  )}
                </span>
                <span className="text-stone-500">{c.phone ?? c.email ?? "—"}</span>
              </li>
            ))}
            {(contacts ?? []).length === 0 && (
              <li className="text-stone-400">{t(messages, "pg.customers.noContacts")}</li>
            )}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
