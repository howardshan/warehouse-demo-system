import { signShippingList } from "@/app/actions/warehouse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

export default async function DeliveryPodPage() {
  const supabase = await createClient();
  const { data: shipping } = await supabase.from("shipping_lists")
    .select("id, sl_number, status, released_at, signed_at, signed_by_name, proof_url, sales_orders(so_number, customer_name_snapshot)")
    .in("status", ["released", "in_transit", "signed"]).order("created_at", { ascending: false });
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">交付凭证 POD</h1><p className="mt-1 text-sm text-stone-500">跟踪已放行发运单；录入签名与凭证后完成签收。</p></div>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">发运单</th><th className="px-4 py-3">订单 / 客户</th><th className="px-4 py-3">放行时间</th><th className="px-4 py-3">POD 状态</th><th className="px-4 py-3">录入凭证</th></tr></thead>
      <tbody>{(shipping ?? []).map((item) => {
        const order = Array.isArray(item.sales_orders) ? item.sales_orders[0] : item.sales_orders;
        const signed = item.status === "signed";
        return <tr key={item.id} className="border-t border-stone-100 align-top"><td className="px-4 py-3 font-mono text-teal-800">{item.sl_number}</td><td className="px-4 py-3">{order?.so_number}<div className="text-stone-500">{order?.customer_name_snapshot}</div></td><td className="px-4 py-3">{item.released_at ? new Date(item.released_at).toLocaleString("zh-CN") : "—"}</td><td className="px-4 py-3"><Badge tone={signed ? "ok" : "warn"}>{signed ? `已签收 · ${item.signed_by_name}` : "待 POD"}</Badge></td><td className="px-4 py-3">{signed ? <span className="text-stone-500">{item.signed_at?.slice(0, 10)}{item.proof_url ? " · 有照片" : ""}</span> : <form action={signShippingList.bind(null, item.id)} className="grid min-w-64 gap-2"><Input name="signed_by_name" required placeholder="签收人" /><Input name="proof_url" type="url" placeholder="凭证照片 URL" /><Button type="submit" size="sm">确认签收</Button></form>}</td></tr>;
      })}{!shipping?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">暂无待处理或已签收发运单</td></tr>}</tbody>
    </table></div>
  </div>;
}
