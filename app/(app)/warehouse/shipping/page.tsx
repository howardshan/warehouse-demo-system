import Link from "next/link";
import { createShippingList } from "@/app/actions/warehouse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ShippingPage() {
  const supabase = await createClient();
  const [{ data: picks }, { data: shipping }] = await Promise.all([
    supabase.from("pick_lists").select("id, pick_number, sales_orders(so_number, customer_name_snapshot)")
      .eq("status", "weighed").order("weighed_at"),
    supabase.from("shipping_lists").select("id, sl_number, status, invoice_status, created_at, sales_orders(so_number, customer_name_snapshot)")
      .order("created_at", { ascending: false }),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">发运管理</h1><p className="mt-1 text-sm text-stone-500">已称重拣货生成发运单，装车前执行第二次信用复核。</p></div>
    <Card><CardHeader><h2 className="font-semibold">待建发运单</h2></CardHeader><CardBody className="flex flex-wrap gap-2">
      {(picks ?? []).map((pick) => {
        const order = pick.sales_orders as unknown as { so_number: string; customer_name_snapshot: string };
        return <form key={pick.id} action={createShippingList.bind(null, pick.id)}><Button type="submit" variant="secondary" size="sm">{pick.pick_number} · {order.so_number} · {order.customer_name_snapshot}</Button></form>;
      })}
      {!picks?.length && <span className="text-sm text-stone-400">没有已称重待发运拣货单</span>}
    </CardBody></Card>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">发运单</th><th className="px-4 py-3">订单</th><th className="px-4 py-3">客户</th><th className="px-4 py-3">发运状态</th><th className="px-4 py-3">开票状态</th></tr></thead>
      <tbody>{(shipping ?? []).map((item) => {
        const order = item.sales_orders as unknown as { so_number: string; customer_name_snapshot: string };
        return <tr key={item.id} className="border-t border-stone-100"><td className="px-4 py-3"><Link className="font-mono text-teal-800 hover:underline" href={`/warehouse/shipping/${item.id}`}>{item.sl_number}</Link></td><td className="px-4 py-3">{order.so_number}</td><td className="px-4 py-3">{order.customer_name_snapshot}</td><td className="px-4 py-3"><Badge>{item.status}</Badge></td><td className="px-4 py-3"><Badge>{item.invoice_status}</Badge></td></tr>;
      })}</tbody>
    </table></div>
  </div>;
}
