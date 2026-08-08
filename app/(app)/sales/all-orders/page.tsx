import { createClient } from "@/lib/supabase/server";
import { getSessionAccess } from "@/lib/auth/access";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { AllOrdersBrowser, type AllOrderRow } from "./all-orders-browser";

export default async function AllOrdersPage() {
  const access = await getSessionAccess();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();

  let q = supabase
    .from("sales_orders")
    .select(
      "id, so_number, customer_name_snapshot, status, order_date, requested_delivery_date, created_at, delivery_note_printed_at, invoice_printed_at",
    )
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false });
  // 业务员只看自己开的；管理员看全部
  if (access.role !== "admin" && access.user) {
    q = q.eq("sales_rep_id", access.user.id);
  }
  const [{ data: orders }, { data: payRows }] = await Promise.all([
    q,
    supabase
      .from("v_sl_payment")
      .select("sales_order_id, paid_amount, balance_amount"),
  ]);

  // 付款状态按发运单聚合到订单
  const payAgg = new Map<string, { paid: number; balance: number }>();
  for (const r of payRows ?? []) {
    const a = payAgg.get(r.sales_order_id) ?? { paid: 0, balance: 0 };
    a.paid += Number(r.paid_amount);
    a.balance += Number(r.balance_amount);
    payAgg.set(r.sales_order_id, a);
  }
  const payStatus = (id: string): AllOrderRow["payStatus"] => {
    const a = payAgg.get(id);
    if (!a) return null;
    if (a.balance <= 0) return "paid";
    if (a.paid > 0) return "partial";
    return "unpaid";
  };

  const rows: AllOrderRow[] = (orders ?? []).map((o) => ({
    id: o.id,
    so_number: o.so_number,
    customer: o.customer_name_snapshot,
    orderDate: o.order_date,
    deliveryDate: o.requested_delivery_date ?? "—",
    status: o.status,
    payStatus: payStatus(o.id),
    deliveryPrinted: !!o.delivery_note_printed_at,
    invoicePrinted: !!o.invoice_printed_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.allOrders.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.allOrders.subtitle")}
        </p>
      </div>
      <AllOrdersBrowser orders={rows} />
    </div>
  );
}
