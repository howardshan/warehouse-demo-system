import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function DashboardPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
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
      label: t(messages, "pg.dashboard.priceAlertsLabel"),
      count: priceAlerts.count ?? 0,
      href: "/purchasing/price-alerts",
      hint: t(messages, "pg.dashboard.priceAlertsHint"),
    },
    {
      label: t(messages, "pg.dashboard.pendingWeightLabel"),
      count: pendingWeight.count ?? 0,
      href: "/warehouse/pending-weight",
      hint: t(messages, "pg.dashboard.pendingWeightHint").replace(
        "{h}",
        String(pendingWeightHours),
      ),
    },
    {
      label: t(messages, "pg.dashboard.missingPodLabel"),
      count: missingPod.count ?? 0,
      href: "/delivery/pod",
      hint: t(messages, "pg.dashboard.missingPodHint"),
    },
    {
      label: t(messages, "pg.dashboard.marginApprovalsLabel"),
      count: marginApprovals.count ?? 0,
      href: "/sales/approvals",
      hint: t(messages, "pg.dashboard.marginApprovalsHint"),
    },
    {
      label: t(messages, "pg.dashboard.creditRiskLabel"),
      count: creditRisk.count ?? 0,
      href: "/finance/credit-control",
      hint: t(messages, "pg.dashboard.creditRiskHint"),
    },
    {
      label: t(messages, "pg.dashboard.permitsLabel"),
      count: permits.count ?? 0,
      href: "/customers",
      hint: t(messages, "pg.dashboard.permitsHint"),
    },
    {
      label: t(messages, "pg.dashboard.nearExpiryLabel"),
      count: nearExpiry.count ?? 0,
      href: "/inventory/batches",
      hint: t(messages, "pg.dashboard.nearExpiryHint"),
    },
    {
      label: t(messages, "pg.dashboard.mismatchesLabel"),
      count: mismatches.count ?? 0,
      href: "/inventory/stock",
      hint: t(messages, "pg.dashboard.mismatchesHint"),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          {t(messages, "pg.dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.dashboard.subtitle")}
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
