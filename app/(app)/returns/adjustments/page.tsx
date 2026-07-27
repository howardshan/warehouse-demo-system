import { createDeliveryAdjustment } from "@/app/actions/returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function DeliveryAdjustmentsPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: adjustments }, { data: shipping }, { data: returns }] = await Promise.all([
    supabase.from("delivery_adjustments")
      .select("id, adjustment_type, qty_units, adjusted_weight_lb, amount, responsibility, reason, approved_at, created_at, shipping_lists(sl_number), return_notes(return_number)")
      .order("created_at", { ascending: false }),
    supabase.from("shipping_lists").select("id, sl_number").in("status", ["released", "in_transit", "signed", "adjusted"]).order("created_at", { ascending: false }),
    supabase.from("return_notes").select("id, return_number").order("created_at", { ascending: false }),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.returns.adjustmentsTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.returns.adjustmentsHint")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.returns.newAdjustment")}</h2></CardHeader><CardBody><form action={createDeliveryAdjustment} className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      <Select name="shipping_list_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.returns.shippingList")}</option>{(shipping ?? []).map((sl) => <option key={sl.id} value={sl.id}>{sl.sl_number}</option>)}</Select>
      <Select name="return_note_id" defaultValue=""><option value="">{t(messages, "pg.returns.noLinkedReturn")}</option>{(returns ?? []).map((note) => <option key={note.id} value={note.id}>{note.return_number}</option>)}</Select>
      <Select name="adjustment_type" defaultValue="short_delivery"><option value="short_delivery">{t(messages, "pg.returns.adjShortDelivery")}</option><option value="over_delivery">{t(messages, "pg.returns.adjOverDelivery")}</option><option value="weight_correction">{t(messages, "pg.returns.adjWeightCorrection")}</option><option value="damage">{t(messages, "pg.returns.adjDamage")}</option><option value="other">{t(messages, "pg.returns.adjOther")}</option></Select>
      <Select name="responsibility" defaultValue="under_investigation"><option value="under_investigation">{t(messages, "pg.returns.responsibilityInvestigating")}</option><option value="ours">{t(messages, "pg.returns.responsibilityOurs")}</option><option value="customer">{t(messages, "pg.returns.responsibilityCustomer")}</option></Select>
      <Input name="qty_units" type="number" step="0.001" defaultValue="0" placeholder={t(messages, "pg.returns.qtyDiff")} />
      <Input name="adjusted_weight_lb" type="number" step="0.001" defaultValue="0" placeholder={t(messages, "pg.returns.weightDiffLb")} />
      <Input name="amount" type="number" step="0.01" defaultValue="0" placeholder={t(messages, "pg.returns.amountDiff")} />
      <Input name="reason" required placeholder={t(messages, "pg.returns.adjustmentReason")} />
      <Button type="submit" className="md:col-span-3 xl:col-span-4">{t(messages, "pg.returns.createAdjustment")}</Button>
    </form></CardBody></Card>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.returns.shippingReturn")}</th><th className="px-4 py-3">{t(messages, "pg.returns.type")}</th><th className="px-4 py-3">{t(messages, "pg.returns.qtyDiffCol")}</th><th className="px-4 py-3">{t(messages, "pg.returns.amount")}</th><th className="px-4 py-3">{t(messages, "pg.returns.reason")}</th><th className="px-4 py-3">{t(messages, "pg.returns.approval")}</th></tr></thead>
      <tbody>{(adjustments ?? []).map((row) => {
        const sl = Array.isArray(row.shipping_lists) ? row.shipping_lists[0] : row.shipping_lists;
        const note = Array.isArray(row.return_notes) ? row.return_notes[0] : row.return_notes;
        return <tr key={row.id} className="border-t border-stone-100"><td className="px-4 py-3">{sl?.sl_number}{note ? ` / ${note.return_number}` : ""}</td><td className="px-4 py-3">{row.adjustment_type}</td><td className="px-4 py-3">{t(messages, "pg.returns.unitsWeight").replace("{u}", String(row.qty_units)).replace("{w}", String(row.adjusted_weight_lb))}</td><td className="px-4 py-3">{formatMoney(Number(row.amount))}</td><td className="px-4 py-3">{row.reason}</td><td className="px-4 py-3"><Badge tone={row.approved_at ? "ok" : "warn"}>{row.approved_at ? t(messages, "pg.returns.approved") : t(messages, "pg.returns.pendingApproval")}</Badge></td></tr>;
      })}{!adjustments?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.returns.noAdjustments")}</td></tr>}</tbody>
    </table></div>
  </div>;
}
