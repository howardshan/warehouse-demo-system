import {
  assignReturnToTrip,
  assignShippingToTrip,
  autoAssignRouteShipments,
  createTrip,
  unassignShippingFromTrip,
} from "@/app/actions/returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

// Supabase 「多对一」嵌套可能返回对象或单元素数组，统一取单对象
function one<T>(v: unknown): T | null {
  const x = Array.isArray(v) ? v[0] : v;
  return (x ?? null) as T | null;
}

type Named = { full_name?: string | null } | null;
type Route = { code: string; name: string } | null;
type Cust = { code: string; name: string; route_stop_seq: number | null } | null;

export default async function DeliveryTripsPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
<<<<<<< HEAD
  const [{ data: trips }, { data: drivers }, { data: unassigned }] = await Promise.all([
    supabase.from("delivery_trips")
      .select("id, trip_number, trip_date, status, started_at, completed_at, user_profiles!delivery_trips_driver_id_fkey(full_name), return_notes(id, return_number)")
      .order("trip_date", { ascending: false }),
    supabase.from("user_profiles").select("id, full_name").eq("role", "driver").eq("is_active", true).order("full_name"),
    supabase.from("return_notes").select("id, return_number").is("delivery_trip_id", null).in("status", ["draft", "authorized", "collected"]),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.delivery.tripsTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.delivery.tripsHint")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.delivery.newTrip")}</h2></CardHeader><CardBody><form action={createTrip} className="grid gap-3 md:grid-cols-4"><Input name="trip_number" placeholder={t(messages, "pg.delivery.tripNumberPlaceholder")} /><Input name="trip_date" type="date" required /><Select name="driver_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.delivery.selectDriver")}</option>{(drivers ?? []).map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name || driver.id}</option>)}</Select><Button type="submit">{t(messages, "pg.delivery.createTrip")}</Button></form></CardBody></Card>
    <div className="grid gap-4 lg:grid-cols-2">{(trips ?? []).map((trip) => {
      const driver = Array.isArray(trip.user_profiles) ? trip.user_profiles[0] : trip.user_profiles;
      return <Card key={trip.id}><CardHeader><div className="flex items-center justify-between"><div><h2 className="font-mono font-semibold">{trip.trip_number}</h2><p className="text-sm text-stone-500">{trip.trip_date} · {driver?.full_name}</p></div><Badge tone={trip.status === "completed" ? "ok" : "warn"}>{trip.status}</Badge></div></CardHeader><CardBody>
        <div className="mb-3 flex flex-wrap gap-2">{(trip.return_notes ?? []).map((note) => <Badge key={note.id}>{note.return_number}</Badge>)}{!trip.return_notes?.length && <span className="text-sm text-stone-400">{t(messages, "pg.delivery.noReturnTasks")}</span>}</div>
        {!!unassigned?.length && <form action={async (formData) => { "use server"; await assignReturnToTrip(String(formData.get("return_note_id")), formData); }} className="flex gap-2"><Select name="return_note_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.delivery.addReturnTask")}</option>{unassigned.map((note) => <option key={note.id} value={note.id}>{note.return_number}</option>)}</Select><input type="hidden" name="delivery_trip_id" value={trip.id} /><Button type="submit" size="sm">{t(messages, "pg.delivery.assign")}</Button></form>}
      </CardBody></Card>;
    })}</div>
  </div>;
=======
  const [{ data: trips }, { data: drivers }, { data: routes }, { data: shipUnassigned }] =
    await Promise.all([
      supabase
        .from("delivery_trips")
        .select(
          "id, trip_number, trip_date, status, vehicle, driver:user_profiles!delivery_trips_driver_id_fkey(full_name), route:routes(code, name), return_notes(id, return_number), shipping_lists(id, sl_number, status, customer:customers(code, name, route_stop_seq))",
        )
        .order("trip_date", { ascending: false }),
      supabase
        .from("user_profiles")
        .select("id, full_name")
        .eq("role", "driver")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("routes")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code"),
      supabase
        .from("shipping_lists")
        .select("id, sl_number, status, customer:customers(code, name)")
        .is("delivery_trip_id", null)
        .in("status", ["ready", "released", "in_transit"]),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">配送趟次</h1>
        <p className="mt-1 text-sm text-stone-500">
          趟次 = 某司机某天按某条路线送发运单（并顺路取回退货）。挂上发运单后即可按站序倒序装车。
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">新建趟次</h2>
        </CardHeader>
        <CardBody>
          <form
            action={createTrip}
            className="grid gap-3 md:grid-cols-3 lg:grid-cols-6"
          >
            <Input name="trip_number" placeholder="趟次号（留空自动生成）" />
            <Input name="trip_date" type="date" required />
            <Select name="route_id" defaultValue="">
              <option value="">（不绑定路线）</option>
              {(routes ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.name}
                </option>
              ))}
            </Select>
            <Input name="vehicle" placeholder="车辆（默认取路线）" />
            <Select name="driver_id" required defaultValue="">
              <option value="" disabled>
                选择司机
              </option>
              {(drivers ?? []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name || driver.id}
                </option>
              ))}
            </Select>
            <Button type="submit">创建趟次</Button>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {(trips ?? []).map((trip) => {
          const driver = one<Named>(trip.driver);
          const route = one<Route>(trip.route);
          const ships = (
            (trip.shipping_lists as {
              id: string;
              sl_number: string;
              status: string;
              customer: unknown;
            }[]) ?? []
          )
            .map((s) => ({ ...s, customer: one<Cust>(s.customer) }))
            .sort(
              (a, b) =>
                (a.customer?.route_stop_seq ?? 999) -
                (b.customer?.route_stop_seq ?? 999),
            );
          return (
            <Card key={trip.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-mono font-semibold">
                      {trip.trip_number}
                    </h2>
                    <p className="text-sm text-stone-500">
                      {trip.trip_date} · {driver?.full_name ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {route ? `${route.code} · ${route.name}` : "未绑定路线"}
                      {trip.vehicle ? ` · 车辆 ${trip.vehicle}` : ""}
                    </p>
                  </div>
                  <Badge tone={trip.status === "completed" ? "ok" : "warn"}>
                    {trip.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {/* 已挂发运单（按站序） */}
                <div>
                  <div className="mb-1 text-xs font-medium text-stone-400">
                    发运单（按站序）
                  </div>
                  {ships.length === 0 ? (
                    <span className="text-sm text-stone-400">尚无发运单</span>
                  ) : (
                    <ul className="space-y-1">
                      {ships.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-2 rounded border border-stone-100 px-2 py-1 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <span className="rounded bg-teal-700 px-1.5 text-xs font-medium text-white">
                              {s.customer?.route_stop_seq ?? "—"}
                            </span>
                            <span className="font-mono text-xs text-stone-500">
                              {s.sl_number}
                            </span>
                            <span>{s.customer?.name ?? "—"}</span>
                          </span>
                          <form
                            action={async () => {
                              "use server";
                              await unassignShippingFromTrip(s.id);
                            }}
                          >
                            <button
                              type="submit"
                              className="text-xs text-stone-400 hover:text-red-700"
                            >
                              移除
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 一键挂本路线发运单 */}
                {route && (
                  <form
                    action={async () => {
                      "use server";
                      await autoAssignRouteShipments(trip.id);
                    }}
                  >
                    <Button type="submit" size="sm" variant="ghost">
                      一键挂本路线已放行发运单
                    </Button>
                  </form>
                )}

                {/* 手动挂发运单 */}
                {!!shipUnassigned?.length && (
                  <form
                    action={async (formData) => {
                      "use server";
                      await assignShippingToTrip(
                        String(formData.get("shipping_list_id")),
                        formData,
                      );
                    }}
                    className="flex gap-2"
                  >
                    <Select name="shipping_list_id" required defaultValue="">
                      <option value="" disabled>
                        添加发运单
                      </option>
                      {shipUnassigned.map((s) => {
                        const c = one<Cust>(s.customer);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.sl_number}
                            {c ? ` · ${c.name}` : ""}
                          </option>
                        );
                      })}
                    </Select>
                    <input
                      type="hidden"
                      name="delivery_trip_id"
                      value={trip.id}
                    />
                    <Button type="submit" size="sm">
                      挂载
                    </Button>
                  </form>
                )}

                {/* 退货任务 */}
                <div>
                  <div className="mb-1 text-xs font-medium text-stone-400">
                    退货取回
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(trip.return_notes ?? []).map((note) => (
                      <Badge key={note.id}>{note.return_number}</Badge>
                    ))}
                    {!trip.return_notes?.length && (
                      <span className="text-sm text-stone-400">尚无退货任务</span>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
>>>>>>> 81fe284f9fcafb093982c6de6b8a33316a2e38cc
}
