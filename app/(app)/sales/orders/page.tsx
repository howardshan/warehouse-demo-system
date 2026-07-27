import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { NewOrderForm } from "./new-order-form";

function tone(status: string) {
  if (status === "confirmed" || status === "closed") return "ok" as const;
  if (status === "pending_approval" || status === "credit_hold") return "warn" as const;
  return "neutral" as const;
}

export default async function SalesOrdersPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: orders }, { data: customers }, { data: addresses }, { data: payRows }] = await Promise.all([
    supabase.from("sales_orders")
      .select("id, so_number, customer_name_snapshot, status, order_date, requested_delivery_date, locked_at")
      .order("created_at", { ascending: false }),
    supabase.from("customers").select("id, code, name").eq("is_active", true).order("code"),
    supabase.from("customer_addresses").select("id, customer_id, label, address, is_default").order("created_at"),
    supabase.from("v_sl_payment").select("sales_order_id, paid_amount, balance_amount"),
  ]);

  // 每个订单的付款状态（按发运单聚合）
  const payAgg = new Map<string, { paid: number; balance: number }>();
  for (const r of payRows ?? []) {
    const a = payAgg.get(r.sales_order_id) ?? { paid: 0, balance: 0 };
    a.paid += Number(r.paid_amount);
    a.balance += Number(r.balance_amount);
    payAgg.set(r.sales_order_id, a);
  }
  function payStatus(orderId: string): "paid" | "partial" | "unpaid" | null {
    const a = payAgg.get(orderId);
    if (!a) return null;
    if (a.balance <= 0) return "paid";
    if (a.paid > 0) return "partial";
    return "unpaid";
  }
  const payTone = { paid: "ok", partial: "warn", unpaid: "danger" } as const;
  const payLabelKey = {
    paid: "pg.payments.statusPaid",
    partial: "pg.payments.statusPartial",
    unpaid: "pg.payments.statusUnpaid",
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t(messages, "pg.sales.orders.title")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t(messages, "pg.sales.orders.subtitle")}</p>
      </div>
      <Card>
        <CardHeader><h2 className="font-semibold">{t(messages, "pg.sales.orders.newOrder")}</h2></CardHeader>
        <CardBody>
          <NewOrderForm customers={customers ?? []} addresses={addresses ?? []} />
        </CardBody>
      </Card>
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr>
            <th className="px-4 py-3">{t(messages, "pg.sales.orders.colOrderNo")}</th><th className="px-4 py-3">{t(messages, "pg.sales.common.customer")}</th>
            <th className="px-4 py-3">{t(messages, "pg.sales.orders.colOrderDate")}</th><th className="px-4 py-3">{t(messages, "pg.sales.orders.colDeliveryDate")}</th>
            <th className="px-4 py-3">{t(messages, "pg.sales.orders.colStatus")}</th>
            <th className="px-4 py-3">{t(messages, "pg.payments.payStatus")}</th>
            <th className="px-4 py-3">{t(messages, "pg.sales.orders.colLocked")}</th>
          </tr></thead>
          <tbody>{(orders ?? []).map((order) => {
            const ps = payStatus(order.id);
            return <tr key={order.id} className="border-t border-stone-100">
            <td className="px-4 py-3"><Link href={`/sales/orders/${order.id}`} className="font-mono text-teal-800 hover:underline">{order.so_number}</Link></td>
            <td className="px-4 py-3">{order.customer_name_snapshot}</td>
            <td className="px-4 py-3">{order.order_date}</td><td className="px-4 py-3">{order.requested_delivery_date ?? "—"}</td>
            <td className="px-4 py-3"><Badge tone={tone(order.status)}>{order.status}</Badge></td>
            <td className="px-4 py-3">{ps ? <Badge tone={payTone[ps]}>{t(messages, payLabelKey[ps])}</Badge> : <span className="text-stone-400">—</span>}</td>
            <td className="px-4 py-3">{order.locked_at ? t(messages, "pg.sales.orders.locked") : t(messages, "pg.sales.orders.unlocked")}</td>
          </tr>;})}</tbody>
        </table>
      </div>
    </div>
  );
}
