import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { statusLabel } from "@/lib/i18n/status";
import { PoCreateForm } from "../purchasing-forms";

const tone = (status: string) =>
  status === "received" || status === "closed"
    ? "ok"
    : status === "cancelled"
      ? "danger"
      : status === "draft"
        ? "neutral"
        : "warn";

export default async function PurchaseOrdersPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: orders }, { data: suppliers }] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("id, po_number, status, order_date, expected_date, currency_code, suppliers(name)")
      .order("created_at", { ascending: false }),
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">{t(messages, "pg.purchasing.purchaseOrders")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.purchasing.purchaseOrdersDesc")}</p></div>
      <PoCreateForm suppliers={(suppliers ?? []).map((supplier) => ({ id: supplier.id, label: supplier.name }))} />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.purchasing.poNumber")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.supplier")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.orderDate")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.expectedDate")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.status")}</th></tr></thead>
          <tbody>
            {(orders ?? []).map((order) => {
              const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers;
              return <tr key={order.id} className="border-t border-stone-100"><td className="px-4 py-3"><Link href={`/purchasing/pos/${order.id}`} className="font-mono text-xs text-teal-800 hover:underline">{order.po_number}</Link></td><td className="px-4 py-3">{supplier?.name ?? "—"}</td><td className="px-4 py-3">{order.order_date}</td><td className="px-4 py-3">{order.expected_date ?? "—"}</td><td className="px-4 py-3"><Badge tone={tone(order.status)}>{statusLabel(messages, "po", order.status)}</Badge></td></tr>;
            })}
            {!orders?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.purchasing.noPurchaseOrders")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
