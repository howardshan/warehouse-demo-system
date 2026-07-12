import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createSalesOrder } from "@/app/actions/sales";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function tone(status: string) {
  if (status === "confirmed" || status === "closed") return "ok" as const;
  if (status === "pending_approval" || status === "credit_hold") return "warn" as const;
  return "neutral" as const;
}

export default async function SalesOrdersPage() {
  const supabase = await createClient();
  const [{ data: orders }, { data: customers }, { data: addresses }] = await Promise.all([
    supabase.from("sales_orders")
      .select("id, so_number, customer_name_snapshot, status, order_date, requested_delivery_date, locked_at")
      .order("created_at", { ascending: false }),
    supabase.from("customers").select("id, code, name").eq("is_active", true).order("code"),
    supabase.from("customer_addresses").select("id, customer_id, label, address").order("created_at"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">销售订单</h1>
        <p className="mt-1 text-sm text-stone-500">价格与成本在订单行创建时固化；每次改行重新校验信用、毛利与 ATP。</p>
      </div>
      <Card>
        <CardHeader><h2 className="font-semibold">新建销售订单</h2></CardHeader>
        <CardBody>
          <form action={createSalesOrder} className="grid gap-4 md:grid-cols-2">
            <div><Label>客户</Label><Select name="customer_id" required defaultValue="">
              <option value="" disabled>请选择客户</option>
              {(customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
            </Select></div>
            <div><Label>送货地址</Label><Select name="delivery_address_id" defaultValue="">
              <option value="">使用客户默认地址</option>
              {(addresses ?? []).map((a) => <option key={a.id} value={a.id}>{a.label ?? "地址"} · {a.address}</option>)}
            </Select></div>
            <div><Label>要求送达日期</Label><Input name="requested_delivery_date" type="date" /></div>
            <div><Label>备注</Label><Input name="notes" /></div>
            <div className="md:col-span-2"><Button type="submit">创建订单</Button></div>
          </form>
        </CardBody>
      </Card>
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr>
            <th className="px-4 py-3">订单号</th><th className="px-4 py-3">客户</th>
            <th className="px-4 py-3">下单日</th><th className="px-4 py-3">送达日</th>
            <th className="px-4 py-3">状态</th><th className="px-4 py-3">锁定</th>
          </tr></thead>
          <tbody>{(orders ?? []).map((order) => <tr key={order.id} className="border-t border-stone-100">
            <td className="px-4 py-3"><Link href={`/sales/orders/${order.id}`} className="font-mono text-teal-800 hover:underline">{order.so_number}</Link></td>
            <td className="px-4 py-3">{order.customer_name_snapshot}</td>
            <td className="px-4 py-3">{order.order_date}</td><td className="px-4 py-3">{order.requested_delivery_date ?? "—"}</td>
            <td className="px-4 py-3"><Badge tone={tone(order.status)}>{order.status}</Badge></td>
            <td className="px-4 py-3">{order.locked_at ? "已锁定" : "未锁定"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
