import { notFound } from "next/navigation";
import { addReturnLine, assignReturnToTrip, driverCollectReturn, receiveReturn } from "@/app/actions/returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export default async function ReturnNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: note } = await supabase.from("return_notes")
    .select("*, customers(name), shipping_lists(sl_number)").eq("id", id).single();
  if (!note) notFound();
  const [{ data: sourceLines }, { data: lines }, { data: trips }] = await Promise.all([
    supabase.from("sl_lines").select("id, line_no, shipped_units, shipped_weight_lb, is_catch_weight_snapshot, products(sku, name), batches(lot_no)")
      .eq("shipping_list_id", note.shipping_list_id).order("line_no"),
    supabase.from("return_lines").select("id, line_no, qty_units, returned_weight_lb, return_reason, disposition, quarantine_batch_id, products(sku, name), batches!return_lines_original_batch_id_fkey(lot_no)")
      .eq("return_note_id", id).order("line_no"),
    supabase.from("delivery_trips").select("id, trip_number, trip_date").in("status", ["planned", "in_progress"]).order("trip_date"),
  ]);
  const customer = Array.isArray(note.customers) ? note.customers[0] : note.customers;
  const shipping = Array.isArray(note.shipping_lists) ? note.shipping_lists[0] : note.shipping_lists;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">{note.return_number}</h1><Badge tone="warn">{note.status}</Badge></div><p className="mt-1 text-sm text-stone-500">{shipping?.sl_number} · {customer?.name}</p></div>{!["received", "processed", "cancelled"].includes(note.status) && <form action={receiveReturn.bind(null, id)}><Button type="submit">{t(messages, "pg.returns.confirmQuarantineReceipt")}</Button></form>}</div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.returns.addReturnLine")}</h2></CardHeader><CardBody>
        <form action={addReturnLine.bind(null, id)} className="grid gap-3 sm:grid-cols-2">
          <Select name="original_sl_line_id" required defaultValue="" className="sm:col-span-2"><option value="" disabled>{t(messages, "pg.returns.selectOriginalLine")}</option>{(sourceLines ?? []).map((line) => {
            const product = Array.isArray(line.products) ? line.products[0] : line.products;
            const batch = Array.isArray(line.batches) ? line.batches[0] : line.batches;
            return <option key={line.id} value={line.id}>#{line.line_no} {product?.sku} · {product?.name} · {batch?.lot_no} · {t(messages, "pg.returns.shippedUnits").replace("{x}", String(line.shipped_units))}</option>;
          })}</Select>
          <Input name="returned_units" type="number" min="0.001" step="0.001" required placeholder={t(messages, "pg.returns.returnedUnits")} />
          <Input name="returned_weight_lb" type="number" min="0" step="0.001" placeholder={t(messages, "pg.returns.returnedWeightLb")} />
          <Select name="return_reason" defaultValue="quality"><option value="quality">{t(messages, "pg.returns.reasonQuality")}</option><option value="wrong_item">{t(messages, "pg.returns.reasonWrongItem")}</option><option value="near_expiry">{t(messages, "pg.returns.reasonNearExpiry")}</option><option value="over_ordered">{t(messages, "pg.returns.reasonOverOrdered")}</option><option value="not_wanted">{t(messages, "pg.returns.reasonNotWanted")}</option><option value="qty_mismatch">{t(messages, "pg.returns.reasonQtyMismatch")}</option><option value="other">{t(messages, "pg.returns.reasonOther")}</option></Select>
          <Input name="reason_detail" placeholder={t(messages, "pg.returns.reasonDetail")} />
          <Button type="submit" className="sm:col-span-2">{t(messages, "pg.returns.addReturnLine")}</Button>
        </form>
      </CardBody></Card>
      <div className="space-y-4">
        <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.returns.assignTrip")}</h2></CardHeader><CardBody><form action={assignReturnToTrip.bind(null, id)} className="flex gap-3"><Select name="delivery_trip_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.returns.selectTrip")}</option>{(trips ?? []).map((trip) => <option key={trip.id} value={trip.id}>{trip.trip_date} · {trip.trip_number}</option>)}</Select><Button type="submit">{t(messages, "pg.returns.assign")}</Button></form></CardBody></Card>
        <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.returns.driverCollectionProof")}</h2></CardHeader><CardBody><form action={driverCollectReturn.bind(null, id)} className="grid gap-3 sm:grid-cols-2"><Input name="photo_url" type="url" required placeholder={t(messages, "pg.returns.photoUrl")} /><Input name="signed_by_name" required placeholder={t(messages, "pg.returns.handoverSignedBy")} /><Button type="submit" className="sm:col-span-2">{t(messages, "pg.returns.recordCollection")}</Button></form><p className="mt-2 text-xs text-stone-400">{t(messages, "pg.returns.driverProofHint")}</p></CardBody></Card>
      </div>
    </div>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.returns.lineCol")}</th><th className="px-4 py-3">{t(messages, "pg.returns.product")}</th><th className="px-4 py-3">{t(messages, "pg.returns.originalLot")}</th><th className="px-4 py-3">{t(messages, "pg.returns.returnedQty")}</th><th className="px-4 py-3">{t(messages, "pg.returns.reason")}</th><th className="px-4 py-3">{t(messages, "pg.returns.disposition")}</th></tr></thead>
      <tbody>{(lines ?? []).map((line) => {
        const product = Array.isArray(line.products) ? line.products[0] : line.products;
        const batch = Array.isArray(line.batches) ? line.batches[0] : line.batches;
        return <tr key={line.id} className="border-t border-stone-100"><td className="px-4 py-3">{line.line_no}</td><td className="px-4 py-3">{product?.sku} · {product?.name}</td><td className="px-4 py-3 font-mono">{batch?.lot_no}</td><td className="px-4 py-3">{t(messages, "pg.returns.unitsSuffix").replace("{x}", String(line.qty_units))}{line.returned_weight_lb != null ? ` / ${line.returned_weight_lb} lb` : ""}</td><td className="px-4 py-3">{line.return_reason}</td><td className="px-4 py-3"><Badge tone={line.disposition === "pending" ? "warn" : "ok"}>{line.disposition}</Badge></td></tr>;
      })}{!lines?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.returns.noReturnLines")}</td></tr>}</tbody>
    </table></div>
  </div>;
}
