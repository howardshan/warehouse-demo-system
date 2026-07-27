import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getSessionAccess } from "@/lib/auth/access";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function AllOrdersPage() {
  const access = await getSessionAccess();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();

  let q = supabase
    .from("sales_orders")
    .select(
      "id, so_number, customer_name_snapshot, order_date, created_at, delivery_note_printed_at, invoice_printed_at",
    )
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false });
  // 业务员只看自己开的；管理员看全部
  if (access.role !== "admin" && access.user) {
    q = q.eq("sales_rep_id", access.user.id);
  }
  const { data: orders } = await q;

  const printedBadge = (printedAt: string | null) =>
    printedAt ? (
      <Badge tone="ok">{t(messages, "pg.allOrders.printed")}</Badge>
    ) : (
      <Badge tone="warn">{t(messages, "pg.allOrders.notPrinted")}</Badge>
    );

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

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">{t(messages, "pg.allOrders.colOrderNo")}</th>
              <th className="px-4 py-3">{t(messages, "pg.allOrders.colCustomer")}</th>
              <th className="px-4 py-3">{t(messages, "pg.allOrders.colOrderDate")}</th>
              <th className="px-4 py-3">{t(messages, "pg.allOrders.deliveryNote")}</th>
              <th className="px-4 py-3">{t(messages, "pg.allOrders.invoice")}</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-stone-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/sales/all-orders/${o.id}`}
                    className="font-mono text-teal-800 hover:underline"
                  >
                    {o.so_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.customer_name_snapshot}</td>
                <td className="px-4 py-3 tabular-nums text-stone-600">
                  {o.order_date}
                </td>
                <td className="px-4 py-3">
                  {printedBadge(o.delivery_note_printed_at)}
                </td>
                <td className="px-4 py-3">
                  {printedBadge(o.invoice_printed_at)}
                </td>
              </tr>
            ))}
            {!orders?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-400">
                  {t(messages, "pg.allOrders.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
