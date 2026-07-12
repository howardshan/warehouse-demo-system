import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { StartReceivingForm } from "../purchasing-forms";

export default async function ReceivingPage() {
  const supabase = await createClient();
  const [{ data: receipts }, { data: purchaseOrders }] = await Promise.all([
    supabase
      .from("goods_receipts")
      .select("id, gr_number, status, received_at, supplier_document_no, purchase_orders(po_number, suppliers(name))")
      .order("received_at", { ascending: false }),
    supabase
      .from("purchase_orders")
      .select("id, po_number, suppliers(name)")
      .in("status", ["issued", "partially_received"])
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">采购收货</h1><p className="mt-1 text-sm text-stone-500">铁律 13：收货员盲收，界面不会显示采购订单数量。</p></div>
      <StartReceivingForm purchaseOrders={(purchaseOrders ?? []).map((po) => {
        const supplier = Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers;
        return { id: po.id, label: `${po.po_number} · ${supplier?.name ?? "—"}` };
      })} />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">收货单</th><th className="px-4 py-3">采购单</th><th className="px-4 py-3">供应商</th><th className="px-4 py-3">送货单号</th><th className="px-4 py-3">收货时间</th><th className="px-4 py-3">状态</th></tr></thead>
          <tbody>
            {(receipts ?? []).map((receipt) => {
              const po = Array.isArray(receipt.purchase_orders) ? receipt.purchase_orders[0] : receipt.purchase_orders;
              const supplier = po && (Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers);
              const tone = receipt.status === "posted" || receipt.status === "matched" ? "ok" : receipt.status === "discrepancy" ? "danger" : "neutral";
              return <tr key={receipt.id} className="border-t border-stone-100"><td className="px-4 py-3"><Link href={`/purchasing/receiving/${receipt.id}`} className="font-mono text-xs text-teal-800 hover:underline">{receipt.gr_number}</Link></td><td className="px-4 py-3 font-mono text-xs">{po?.po_number}</td><td className="px-4 py-3">{supplier?.name ?? "—"}</td><td className="px-4 py-3">{receipt.supplier_document_no ?? "—"}</td><td className="px-4 py-3">{new Date(receipt.received_at).toLocaleString("zh-CN")}</td><td className="px-4 py-3"><Badge tone={tone}>{receipt.status}</Badge></td></tr>;
            })}
            {!receipts?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">暂无收货单</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
