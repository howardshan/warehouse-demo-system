import { redirect } from "next/navigation";
import { getSessionAccess, can } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { RouteCreateForm } from "./route-form";

const WEEKDAY_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

type RouteStop = {
  code: string;
  name: string;
  route_stop_seq: number | null;
};

export default async function RoutesPage() {
  const access = await getSessionAccess();
  if (!can(access.permissions, "warehouse.routes.write")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: routes } = await supabase
    .from("routes")
    .select(
      "id, code, name, delivery_weekday, default_vehicle, cutoff_time, is_active, customers(code, name, route_stop_seq)",
    )
    .order("code");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">配送路线</h1>
        <p className="mt-1 text-sm text-stone-500">
          每条路线固定配送日与站点顺序；装车时按站序倒序（后送先装）。
        </p>
      </div>

      <RouteCreateForm />

      <div className="space-y-4">
        {(routes ?? []).map((r) => {
          const stops = ((r.customers as RouteStop[]) ?? [])
            .slice()
            .sort(
              (a, b) => (a.route_stop_seq ?? 999) - (b.route_stop_seq ?? 999),
            );
          return (
            <Card key={r.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">
                    <span className="font-mono text-sm text-stone-500">
                      {r.code}
                    </span>{" "}
                    {r.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {WEEKDAY_ZH[r.delivery_weekday]} · 车辆{" "}
                    {r.default_vehicle ?? "—"}
                    {r.cutoff_time ? ` · 截单 ${r.cutoff_time}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{stops.length} 站</Badge>
                  <Badge tone={r.is_active ? "ok" : "neutral"}>
                    {r.is_active ? "active" : "inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                {stops.length === 0 ? (
                  <p className="text-sm text-stone-400">尚无客户绑定到此路线。</p>
                ) : (
                  <ol className="flex flex-wrap gap-2 text-sm">
                    {stops.map((c) => (
                      <li
                        key={c.code}
                        className="flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-1"
                      >
                        <span className="rounded bg-teal-700 px-1.5 text-xs font-medium text-white">
                          {c.route_stop_seq ?? "—"}
                        </span>
                        <span className="font-mono text-xs text-stone-500">
                          {c.code}
                        </span>
                        <span className="text-stone-700">{c.name}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
