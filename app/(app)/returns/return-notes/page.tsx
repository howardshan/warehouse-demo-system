import Link from "next/link";
import { createReturnNote } from "@/app/actions/returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";

export default async function ReturnNotesPage() {
  const supabase = await createClient();
  const [{ data: notes }, { data: shipping }, { data: quarantine }] = await Promise.all([
    supabase.from("return_notes")
      .select("id, return_number, return_type, status, responsibility, created_at, customers(name), shipping_lists(sl_number), delivery_trips(trip_number)")
      .order("created_at", { ascending: false }),
    supabase.from("shipping_lists").select("id, sl_number, status, customers(name)")
      .in("status", ["released", "in_transit", "signed", "adjusted"]).order("created_at", { ascending: false }),
    supabase.from("locations").select("id, code").eq("type", "quarantine").eq("is_active", true).order("code"),
  ]);

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">退货单</h1><p className="mt-1 text-sm text-stone-500">每张退货单必须关联原始发运单，收货后自动进入隔离区。</p></div>
    <Card><CardHeader><h2 className="font-semibold">新建退货单</h2></CardHeader><CardBody>
      <form action={createReturnNote} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select name="original_sl_id" required defaultValue=""><option value="" disabled>原始发运单</option>{(shipping ?? []).map((sl) => {
          const customer = Array.isArray(sl.customers) ? sl.customers[0] : sl.customers;
          return <option key={sl.id} value={sl.id}>{sl.sl_number} · {customer?.name}</option>;
        })}</Select>
        <Select name="return_type" defaultValue="post_delivery"><option value="post_delivery">送达后退货</option><option value="on_delivery_rejection">现场拒收</option></Select>
        <Select name="quarantine_location_id" required defaultValue=""><option value="" disabled>隔离储位</option>{(quarantine ?? []).map((location) => <option key={location.id} value={location.id}>{location.code}</option>)}</Select>
        <Select name="responsibility" defaultValue="under_investigation"><option value="under_investigation">责任调查中</option><option value="ours">我方责任</option><option value="customer">客户责任</option></Select>
        <Input name="notes" placeholder="备注" className="md:col-span-2 xl:col-span-3" />
        <Button type="submit">创建退货单</Button>
      </form>
    </CardBody></Card>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">退货单</th><th className="px-4 py-3">原发运</th><th className="px-4 py-3">客户</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">趟次</th><th className="px-4 py-3">状态</th></tr></thead>
      <tbody>{(notes ?? []).map((note) => {
        const customer = Array.isArray(note.customers) ? note.customers[0] : note.customers;
        const sl = Array.isArray(note.shipping_lists) ? note.shipping_lists[0] : note.shipping_lists;
        const trip = Array.isArray(note.delivery_trips) ? note.delivery_trips[0] : note.delivery_trips;
        return <tr key={note.id} className="border-t border-stone-100"><td className="px-4 py-3"><Link href={`/returns/return-notes/${note.id}`} className="font-mono text-teal-800 hover:underline">{note.return_number}</Link></td><td className="px-4 py-3">{sl?.sl_number}</td><td className="px-4 py-3">{customer?.name}</td><td className="px-4 py-3">{note.return_type === "post_delivery" ? "送达后" : "现场拒收"}</td><td className="px-4 py-3">{trip?.trip_number ?? "未分配"}</td><td className="px-4 py-3"><Badge tone={note.status === "processed" ? "ok" : note.status === "cancelled" ? "danger" : "warn"}>{note.status}</Badge></td></tr>;
      })}{!notes?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">暂无退货单</td></tr>}</tbody>
    </table></div>
  </div>;
}
