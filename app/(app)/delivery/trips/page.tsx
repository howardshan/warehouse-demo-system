import { assignReturnToTrip, createTrip } from "@/app/actions/returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";

export default async function DeliveryTripsPage() {
  const supabase = await createClient();
  const [{ data: trips }, { data: drivers }, { data: unassigned }] = await Promise.all([
    supabase.from("delivery_trips")
      .select("id, trip_number, trip_date, status, started_at, completed_at, user_profiles!delivery_trips_driver_id_fkey(full_name), return_notes(id, return_number)")
      .order("trip_date", { ascending: false }),
    supabase.from("user_profiles").select("id, full_name").eq("role", "driver").eq("is_active", true).order("full_name"),
    supabase.from("return_notes").select("id, return_number").is("delivery_trip_id", null).in("status", ["draft", "authorized", "collected"]),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">配送趟次</h1><p className="mt-1 text-sm text-stone-500">建立司机趟次并将待取回退货分配到路线。</p></div>
    <Card><CardHeader><h2 className="font-semibold">新建趟次</h2></CardHeader><CardBody><form action={createTrip} className="grid gap-3 md:grid-cols-4"><Input name="trip_number" placeholder="趟次号（留空自动生成）" /><Input name="trip_date" type="date" required /><Select name="driver_id" required defaultValue=""><option value="" disabled>选择司机</option>{(drivers ?? []).map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name || driver.id}</option>)}</Select><Button type="submit">创建趟次</Button></form></CardBody></Card>
    <div className="grid gap-4 lg:grid-cols-2">{(trips ?? []).map((trip) => {
      const driver = Array.isArray(trip.user_profiles) ? trip.user_profiles[0] : trip.user_profiles;
      return <Card key={trip.id}><CardHeader><div className="flex items-center justify-between"><div><h2 className="font-mono font-semibold">{trip.trip_number}</h2><p className="text-sm text-stone-500">{trip.trip_date} · {driver?.full_name}</p></div><Badge tone={trip.status === "completed" ? "ok" : "warn"}>{trip.status}</Badge></div></CardHeader><CardBody>
        <div className="mb-3 flex flex-wrap gap-2">{(trip.return_notes ?? []).map((note) => <Badge key={note.id}>{note.return_number}</Badge>)}{!trip.return_notes?.length && <span className="text-sm text-stone-400">尚无退货任务</span>}</div>
        {!!unassigned?.length && <form action={async (formData) => { "use server"; await assignReturnToTrip(String(formData.get("return_note_id")), formData); }} className="flex gap-2"><Select name="return_note_id" required defaultValue=""><option value="" disabled>添加退货任务</option>{unassigned.map((note) => <option key={note.id} value={note.id}>{note.return_number}</option>)}</Select><input type="hidden" name="delivery_trip_id" value={trip.id} /><Button type="submit" size="sm">分配</Button></form>}
      </CardBody></Card>;
    })}</div>
  </div>;
}
