import Link from "next/link";
import { createReturnNote } from "@/app/actions/returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export default async function ReturnNotesPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
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
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.returns.returnNotesTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.returns.returnNotesHint")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.returns.newReturnNote")}</h2></CardHeader><CardBody>
      <form action={createReturnNote} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select name="original_sl_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.returns.originalShippingList")}</option>{(shipping ?? []).map((sl) => {
          const customer = Array.isArray(sl.customers) ? sl.customers[0] : sl.customers;
          return <option key={sl.id} value={sl.id}>{sl.sl_number} · {customer?.name}</option>;
        })}</Select>
        <Select name="return_type" defaultValue="post_delivery"><option value="post_delivery">{t(messages, "pg.returns.postDelivery")}</option><option value="on_delivery_rejection">{t(messages, "pg.returns.onDeliveryRejection")}</option></Select>
        <Select name="quarantine_location_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.returns.quarantineLocation")}</option>{(quarantine ?? []).map((location) => <option key={location.id} value={location.id}>{location.code}</option>)}</Select>
        <Select name="responsibility" defaultValue="under_investigation"><option value="under_investigation">{t(messages, "pg.returns.responsibilityInvestigating")}</option><option value="ours">{t(messages, "pg.returns.responsibilityOurs")}</option><option value="customer">{t(messages, "pg.returns.responsibilityCustomer")}</option></Select>
        <Input name="notes" placeholder={t(messages, "pg.returns.notes")} className="md:col-span-2 xl:col-span-3" />
        <Button type="submit">{t(messages, "pg.returns.createReturnNote")}</Button>
      </form>
    </CardBody></Card>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.returns.returnNote")}</th><th className="px-4 py-3">{t(messages, "pg.returns.originalShipping")}</th><th className="px-4 py-3">{t(messages, "pg.returns.customer")}</th><th className="px-4 py-3">{t(messages, "pg.returns.type")}</th><th className="px-4 py-3">{t(messages, "pg.returns.trip")}</th><th className="px-4 py-3">{t(messages, "pg.returns.status")}</th></tr></thead>
      <tbody>{(notes ?? []).map((note) => {
        const customer = Array.isArray(note.customers) ? note.customers[0] : note.customers;
        const sl = Array.isArray(note.shipping_lists) ? note.shipping_lists[0] : note.shipping_lists;
        const trip = Array.isArray(note.delivery_trips) ? note.delivery_trips[0] : note.delivery_trips;
        return <tr key={note.id} className="border-t border-stone-100"><td className="px-4 py-3"><Link href={`/returns/return-notes/${note.id}`} className="font-mono text-teal-800 hover:underline">{note.return_number}</Link></td><td className="px-4 py-3">{sl?.sl_number}</td><td className="px-4 py-3">{customer?.name}</td><td className="px-4 py-3">{note.return_type === "post_delivery" ? t(messages, "pg.returns.postDeliveryShort") : t(messages, "pg.returns.onDeliveryRejection")}</td><td className="px-4 py-3">{trip?.trip_number ?? t(messages, "pg.returns.unassigned")}</td><td className="px-4 py-3"><Badge tone={note.status === "processed" ? "ok" : note.status === "cancelled" ? "danger" : "warn"}>{note.status}</Badge></td></tr>;
      })}{!notes?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.returns.noReturnNotes")}</td></tr>}</tbody>
    </table></div>
  </div>;
}
