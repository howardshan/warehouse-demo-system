import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date();
  const inThirtyDays = new Date(today);
  inThirtyDays.setDate(today.getDate() + 30);
  const isoToday = today.toISOString().slice(0, 10);
  const isoThirtyDays = inThirtyDays.toISOString().slice(0, 10);
  const { data: weightSetting } = await supabase.from("settings")
    .select("value").eq("key", "pending_weight_alert_hours").maybeSingle();
  const pendingWeightHours = Number(weightSetting?.value ?? 4);
  const weightCutoff = new Date(Date.now() - pendingWeightHours * 60 * 60 * 1000).toISOString();

  const [priceAlerts, pendingWeight, missingPod, marginApprovals, creditRisk, permits, nearExpiry, mismatches] = await Promise.all([
    supabase.from("price_change_alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("pick_lists").select("id", { count: "exact", head: true }).eq("status", "picked_pending_weight").lt("picked_at", weightCutoff),
    supabase.from("shipping_lists").select("id", { count: "exact", head: true }).in("status", ["released", "in_transit"]).is("signed_at", null),
    supabase.from("so_approvals").select("id", { count: "exact", head: true }).eq("status", "pending").in("approval_type", ["margin", "below_cost"]),
    supabase.from("customers").select("id", { count: "exact", head: true }).in("credit_status", ["over_limit", "hold_new_orders", "full_block"]),
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("sales_permit_expiry", isoToday).lte("sales_permit_expiry", isoThirtyDays),
    supabase.from("batches").select("id", { count: "exact", head: true }).eq("status", "available").gte("expiry_date", isoToday).lte("expiry_date", isoThirtyDays),
    supabase.from("cycle_count_tasks").select("id", { count: "exact", head: true }).eq("reason", "stock_mismatch").in("status", ["open", "counting"]),
  ]);

  const tiles = [
    {
      label: "待处理涨价提醒",
      count: priceAlerts.count ?? 0,
      href: "/purchasing/price-alerts",
      hint: "成本上涨非阻断提醒",
    },
    {
      label: "超时待称重筐",
      count: pendingWeight.count ?? 0,
      href: "/warehouse/pending-weight",
      hint: `已拣完超过 ${pendingWeightHours} 小时`,
    },
    {
      label: "待录入 POD / 调整",
      count: missingPod.count ?? 0,
      href: "/delivery/pod",
      hint: "已放行或运输中但未签收",
    },
    {
      label: "待毛利审批",
      count: marginApprovals.count ?? 0,
      href: "/sales/approvals",
      hint: "低毛利或低于成本",
    },
    {
      label: "信用受限客户",
      count: creditRisk.count ?? 0,
      href: "/finance/credit-control",
      hint: "超额、暂停新单或完全冻结",
    },
    {
      label: "30 天内 Permit 到期",
      count: permits.count ?? 0,
      href: "/customers",
      hint: "Sales Permit 到期预警",
    },
    {
      label: "30 天内临期批次",
      count: nearExpiry.count ?? 0,
      href: "/inventory/batches",
      hint: "仍处于 available 的批次",
    },
    {
      label: "库存不符盘点",
      count: mismatches.count ?? 0,
      href: "/inventory/stock",
      hint: "stock_mismatch 待办任务",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">待办看板</h1>
        <p className="mt-1 text-sm text-stone-500">
          Phase 9 运营异常汇总；点击卡片进入对应处理队列。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="transition hover:border-teal-700/40">
              <CardHeader>
                <div className="text-sm text-stone-500">{t.label}</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  {t.count}
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-stone-500">{t.hint}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
