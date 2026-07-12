import Link from "next/link";
import { generatePickList, withdrawPickList } from "@/app/actions/warehouse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

export default async function PickListsPage() {
  const supabase = await createClient();
  const [{ data: orders }, { data: picks }] = await Promise.all([
    supabase.from("sales_orders").select("id, so_number, customer_name_snapshot").eq("status", "confirmed").order("created_at"),
    supabase.from("pick_lists").select("id, pick_number, status, created_at, sales_orders(so_number, customer_name_snapshot)").order("created_at", { ascending: false }),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">拣货单管理</h1><p className="mt-1 text-sm text-stone-500">仅已确认订单可生成拣货单；生成后数据库立即锁定销售订单。</p></div>
    <Card><CardHeader><h2 className="font-semibold">待生成订单</h2></CardHeader><CardBody className="flex flex-wrap gap-2">
      {(orders ?? []).map((order) => <form key={order.id} action={generatePickList.bind(null, order.id)}><Button variant="secondary" size="sm">{order.so_number} · {order.customer_name_snapshot}</Button></form>)}
      {!orders?.length && <span className="text-sm text-stone-400">没有待生成订单</span>}
    </CardBody></Card>
    <Card><CardHeader><h2 className="font-semibold">拣货单</h2></CardHeader><CardBody className="space-y-3">
      {(picks ?? []).map((pick) => {
        const order = pick.sales_orders as unknown as { so_number: string; customer_name_snapshot: string };
        return <div key={pick.id} className="grid items-center gap-3 rounded border border-stone-100 p-3 md:grid-cols-[1fr_auto_360px]">
          <div><Link href="/warehouse/picking" className="font-mono text-teal-800 hover:underline">{pick.pick_number}</Link><div className="text-sm text-stone-500">{order.so_number} · {order.customer_name_snapshot}</div></div>
          <Badge>{pick.status}</Badge>
          {!["shipped", "cancelled"].includes(pick.status) && <form action={withdrawPickList.bind(null, pick.id)} className="flex gap-2"><Input name="reason" required placeholder="撤销原因" /><Button type="submit" variant="danger" size="sm">撤销并解锁</Button></form>}
        </div>;
      })}
    </CardBody></Card>
  </div>;
}
