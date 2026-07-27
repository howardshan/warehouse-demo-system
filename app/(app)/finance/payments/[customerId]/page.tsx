import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { PaymentsCustomerClient } from "./payments-client";
import type { MonthGroup, PayRow, LedgerRow } from "./payments-client";

export default async function CustomerPaymentsPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const supabase = await createClient();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  const [
    { data: customer },
    { data: slRows },
    { data: prepaid },
    { data: ledger },
  ] = await Promise.all([
      supabase
        .from("customers")
        .select("id, code, name")
        .eq("id", customerId)
        .maybeSingle(),
      supabase
        .from("v_sl_payment")
        .select(
          "shipping_list_id, sales_order_id, signed_at, due_amount, paid_amount, balance_amount, pay_status",
        )
        .eq("customer_id", customerId)
        .order("signed_at", { ascending: false }),
      supabase
        .from("v_customer_prepaid")
        .select("prepaid_balance")
        .eq("customer_id", customerId)
        .maybeSingle(),
      supabase
        .from("customer_payments")
        .select("id, kind, amount, from_prepaid, method, note, paid_at, shipping_list_id, proof_url, check_no, ach_txn_no")
        .eq("customer_id", customerId)
        .order("paid_at", { ascending: false })
        .limit(100),
    ]);

  if (!customer) notFound();

  // so_number 映射
  const soIds = [...new Set((slRows ?? []).map((r) => r.sales_order_id))];
  const { data: orders } = soIds.length
    ? await supabase.from("sales_orders").select("id, so_number").in("id", soIds)
    : { data: [] as { id: string; so_number: string }[] };
  const soMap = new Map((orders ?? []).map((o) => [o.id, o.so_number]));

  // 按月分组
  const groupMap = new Map<string, PayRow[]>();
  for (const r of slRows ?? []) {
    const ym = r.signed_at ? String(r.signed_at).slice(0, 7) : "—";
    const row: PayRow = {
      shippingListId: r.shipping_list_id,
      soNumber: soMap.get(r.sales_order_id) ?? r.sales_order_id.slice(0, 8),
      date: r.signed_at ? String(r.signed_at).slice(0, 10) : "—",
      due: Number(r.due_amount),
      paid: Number(r.paid_amount),
      balance: Number(r.balance_amount),
      status: r.pay_status as PayRow["status"],
    };
    const arr = groupMap.get(ym) ?? [];
    arr.push(row);
    groupMap.set(ym, arr);
  }
  const months: MonthGroup[] = [...groupMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([ym, rows]) => ({
      ym,
      due: rows.reduce((s, r) => s + r.due, 0),
      balance: rows.reduce((s, r) => s + r.balance, 0),
      rows,
    }));

  const ledgerRows: LedgerRow[] = (ledger ?? []).map((l) => ({
    id: l.id,
    kind: l.kind,
    amount: Number(l.amount),
    fromPrepaid: l.from_prepaid,
    method: l.method,
    note: l.note,
    paidAt: l.paid_at ? String(l.paid_at).slice(0, 10) : "—",
    soNumber: l.shipping_list_id ? soMap.get(l.shipping_list_id) ?? null : null,
    proofUrl: l.proof_url ?? null,
    checkNo: l.check_no ?? null,
    achTxnNo: l.ach_txn_no ?? null,
  }));

  const prepaidBalance = Number(prepaid?.prepaid_balance ?? 0);
  const unpaidTotal = months.reduce((s, m) => s + m.balance, 0);

  const labels = {
    back: t(messages, "pg.payments.title"),
    customer: `${customer.code} · ${customer.name}`,
    unpaidTotal: t(messages, "pg.payments.unpaidTotal"),
    prepaidBalance: t(messages, "pg.payments.prepaidBalance"),
    topup: t(messages, "pg.payments.topup"),
    refund: t(messages, "pg.payments.refund"),
    amount: t(messages, "pg.payments.amount"),
    method: t(messages, "pg.payments.method"),
    note: t(messages, "pg.payments.note"),
    selectAll: t(messages, "pg.payments.selectAll"),
    bulkMarkPaid: t(messages, "pg.payments.bulkMarkPaid"),
    usePrepaid: t(messages, "pg.payments.usePrepaid"),
    order: t(messages, "pg.payments.order"),
    date: t(messages, "pg.payments.date"),
    due: t(messages, "pg.payments.due"),
    paid: t(messages, "pg.payments.paid"),
    balanceCol: t(messages, "pg.payments.balanceCol"),
    status: t(messages, "pg.payments.status"),
    action: t(messages, "pg.payments.action"),
    statusPaid: t(messages, "pg.payments.statusPaid"),
    statusPartial: t(messages, "pg.payments.statusPartial"),
    statusUnpaid: t(messages, "pg.payments.statusUnpaid"),
    pay: t(messages, "pg.payments.pay"),
    payFull: t(messages, "pg.payments.payFull"),
    payAmountPlaceholder: t(messages, "pg.payments.payAmountPlaceholder"),
    confirm: t(messages, "pg.payments.confirm"),
    cancel: t(messages, "pg.payments.cancel"),
    ledgerTitle: t(messages, "pg.payments.ledgerTitle"),
    ledgerEmpty: t(messages, "pg.payments.ledgerEmpty"),
    kindOrderPayment: t(messages, "pg.payments.kindOrderPayment"),
    kindTopup: t(messages, "pg.payments.kindTopup"),
    kindRefund: t(messages, "pg.payments.kindRefund"),
    selectedCount: t(messages, "pg.payments.selectedCount"),
    nothingSelected: t(messages, "pg.payments.nothingSelected"),
    receiveTitle: t(messages, "pg.payments.receiveTitle"),
    receiveAmount: t(messages, "pg.payments.receiveAmount"),
    payMethod: t(messages, "pg.payments.payMethod"),
    methodCash: t(messages, "pg.payments.methodCash"),
    methodCheck: t(messages, "pg.payments.methodCheck"),
    methodAch: t(messages, "pg.payments.methodAch"),
    checkNo: t(messages, "pg.payments.checkNo"),
    achTxnNo: t(messages, "pg.payments.achTxnNo"),
    proofPhoto: t(messages, "pg.payments.proofPhoto"),
    receive: t(messages, "pg.payments.receive"),
    allocPreview: t(messages, "pg.payments.allocPreview"),
    toPrepaid: t(messages, "pg.payments.toPrepaid"),
    willPay: t(messages, "pg.payments.willPay"),
    printSelected: t(messages, "pg.payments.printSelected"),
    proofView: t(messages, "pg.payments.proofView"),
    noUnpaid: t(messages, "pg.payments.noUnpaid"),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/finance/payments"
          className="text-sm text-teal-800 hover:underline"
        >
          ← {labels.back}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{customer.name}</h1>
        <p className="text-sm text-stone-500">{customer.code}</p>
      </div>

      <PaymentsCustomerClient
        customerId={customerId}
        months={months}
        ledger={ledgerRows}
        prepaidBalance={prepaidBalance}
        unpaidTotal={unpaidTotal}
        labels={labels}
      />
    </div>
  );
}
