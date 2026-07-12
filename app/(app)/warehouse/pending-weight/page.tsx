import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function PendingWeightPage() {
  const supabase = await createClient();
  const [{ data: picks }, { data: setting }] = await Promise.all([
    supabase.from("pick_lists").select("id, pick_number, picked_at, sales_orders(so_number, customer_name_snapshot)")
      .eq("status", "picked_pending_weight").order("picked_at"),
    supabase.from("settings").select("value").eq("key", "pending_weight_alert_hours").maybeSingle(),
  ]);
  const threshold = Number(setting?.value ?? 4);
  const now = Date.now();
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">待称重看板</h1><p className="mt-1 text-sm text-stone-500">拣完超过 {threshold} 小时仍未完成称重将标红。</p></div>
    <Card><CardHeader><h2 className="font-semibold">积压拣货单</h2></CardHeader><CardBody className="space-y-3">
      {(picks ?? []).map((pick) => {
        const order = pick.sales_orders as unknown as { so_number: string; customer_name_snapshot: string };
        const hours = pick.picked_at ? (now - new Date(pick.picked_at).getTime()) / 3_600_000 : 0;
        return <div key={pick.id} className="flex items-center justify-between rounded border border-stone-100 p-4">
          <div><div className="font-mono font-medium">{pick.pick_number}</div><div className="text-sm text-stone-500">{order.so_number} · {order.customer_name_snapshot}</div></div>
          <Badge tone={hours >= threshold ? "danger" : "warn"}>{hours.toFixed(1)} 小时</Badge>
        </div>;
      })}
      {!picks?.length && <p className="text-sm text-stone-400">当前没有待称重拣货单</p>}
    </CardBody></Card>
  </div>;
}
