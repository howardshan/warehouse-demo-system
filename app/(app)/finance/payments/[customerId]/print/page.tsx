import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/utils";
import { AutoPrint } from "./auto-print";

export default async function PaymentStatementPrint({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const { customerId } = await params;
  const { ids } = await searchParams;
  const idList = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const supabase = await createClient();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  const [{ data: customer }, { data: rows }, { data: addr }] = await Promise.all([
    supabase.from("customers").select("code, name").eq("id", customerId).maybeSingle(),
    idList.length
      ? supabase
          .from("v_sl_payment")
          .select("shipping_list_id, sales_order_id, signed_at, due_amount, paid_amount, balance_amount, pay_status")
          .in("shipping_list_id", idList)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("customer_addresses")
      .select("address, is_default")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false })
      .limit(1),
  ]);
  if (!customer) notFound();

  const soIds = [...new Set((rows ?? []).map((r) => r.sales_order_id))];
  const { data: orders } = soIds.length
    ? await supabase.from("sales_orders").select("id, so_number").in("id", soIds)
    : { data: [] as { id: string; so_number: string }[] };
  const soMap = new Map((orders ?? []).map((o) => [o.id, o.so_number]));

  const items = (rows ?? [])
    .map((r) => ({
      soNumber: soMap.get(r.sales_order_id) ?? String(r.sales_order_id).slice(0, 8),
      date: r.signed_at ? String(r.signed_at).slice(0, 10) : "—",
      due: Number(r.due_amount),
      paid: Number(r.paid_amount),
      balance: Number(r.balance_amount),
      status: r.pay_status as string,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalDue = items.reduce((s, r) => s + r.due, 0);
  const totalPaid = items.reduce((s, r) => s + r.paid, 0);
  const totalBalance = items.reduce((s, r) => s + r.balance, 0);
  const address = addr?.[0]?.address ?? null;

  const statusText = (st: string) =>
    st === "paid"
      ? t(messages, "pg.payments.statusPaid")
      : st === "partial"
        ? t(messages, "pg.payments.statusPartial")
        : t(messages, "pg.payments.statusUnpaid");

  return (
    <div className="print-area mx-auto max-w-3xl bg-white p-8 text-stone-900">
      <AutoPrint />
      <div className="mb-6">
        <h1 className="text-xl font-bold">{t(messages, "pg.payments.statementTitle")}</h1>
        <div className="mt-2 text-sm">
          <div className="font-semibold">{customer.name}</div>
          <div className="text-stone-500">{customer.code}</div>
          {address && (
            <div className="text-stone-500">
              {t(messages, "pg.payments.address")}: {address}
            </div>
          )}
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-stone-800 text-left">
            <th className="py-2">{t(messages, "pg.payments.order")}</th>
            <th className="py-2">{t(messages, "pg.payments.date")}</th>
            <th className="py-2 text-right">{t(messages, "pg.payments.due")}</th>
            <th className="py-2 text-right">{t(messages, "pg.payments.paid")}</th>
            <th className="py-2 text-right">{t(messages, "pg.payments.balanceCol")}</th>
            <th className="py-2">{t(messages, "pg.payments.status")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={i} className="border-b border-stone-200">
              <td className="py-2 font-mono text-xs">{r.soNumber}</td>
              <td className="py-2 tabular-nums">{r.date}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(r.due)}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(r.paid)}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(r.balance)}</td>
              <td className="py-2">{statusText(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between border-t-2 border-stone-800 pt-2">
          <span className="text-stone-600">{t(messages, "pg.payments.totalAmount")}</span>
          <span className="font-semibold tabular-nums">{formatMoney(totalDue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">{t(messages, "pg.payments.paidAmount")}</span>
          <span className="tabular-nums">{formatMoney(totalPaid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">{t(messages, "pg.payments.unpaidAmount")}</span>
          <span className="font-semibold tabular-nums text-red-600">
            {formatMoney(totalBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}
