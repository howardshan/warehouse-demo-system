import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
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
      <div><h1 className="text-2xl font-semibold">采购订单</h1><p className="mt-1 text-sm text-stone-500">创建、维护并签发采购订单。</p></div>
      <PoCreateForm suppliers={(suppliers ?? []).map((supplier) => ({ id: supplier.id, label: supplier.name }))} />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">单号</th><th className="px-4 py-3">供应商</th><th className="px-4 py-3">订单日</th><th className="px-4 py-3">预计到货</th><th className="px-4 py-3">状态</th></tr></thead>
          <tbody>
            {(orders ?? []).map((order) => {
              const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers;
              return <tr key={order.id} className="border-t border-stone-100"><td className="px-4 py-3"><Link href={`/purchasing/pos/${order.id}`} className="font-mono text-xs text-teal-800 hover:underline">{order.po_number}</Link></td><td className="px-4 py-3">{supplier?.name ?? "—"}</td><td className="px-4 py-3">{order.order_date}</td><td className="px-4 py-3">{order.expected_date ?? "—"}</td><td className="px-4 py-3"><Badge tone={tone(order.status)}>{order.status}</Badge></td></tr>;
            })}
            {!orders?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">暂无采购订单</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
