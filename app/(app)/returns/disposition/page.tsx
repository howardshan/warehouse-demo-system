import { disposeReturnLine } from "@/app/actions/returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export default async function ReturnDispositionPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: lines }, { data: locations }] = await Promise.all([
    supabase.from("return_lines")
      .select("id, qty_units, returned_weight_lb, return_reason, disposition, quarantine_batch_id, products(sku, name), return_notes!inner(return_number, status), batches!return_lines_quarantine_batch_id_fkey(lot_no)")
      .not("quarantine_batch_id", "is", null).order("created_at"),
    supabase.from("locations").select("id, code, type").eq("is_active", true)
      .in("type", ["pick_face", "reserve", "overflow"]).order("code"),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.returns.dispositionTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.returns.dispositionHint")}</p></div>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.returns.returnNote")}</th><th className="px-4 py-3">{t(messages, "pg.returns.productQuarantineLot")}</th><th className="px-4 py-3">{t(messages, "pg.returns.returnedQty")}</th><th className="px-4 py-3">{t(messages, "pg.returns.reason")}</th><th className="px-4 py-3">{t(messages, "pg.returns.statusAction")}</th></tr></thead>
      <tbody>{(lines ?? []).map((line) => {
        const product = Array.isArray(line.products) ? line.products[0] : line.products;
        const note = Array.isArray(line.return_notes) ? line.return_notes[0] : line.return_notes;
        const batch = Array.isArray(line.batches) ? line.batches[0] : line.batches;
        return <tr key={line.id} className="border-t border-stone-100 align-top"><td className="px-4 py-3 font-mono">{note?.return_number}</td><td className="px-4 py-3">{product?.sku} · {product?.name}<div className="font-mono text-xs text-stone-400">{batch?.lot_no}</div></td><td className="px-4 py-3">{t(messages, "pg.returns.unitsSuffix").replace("{x}", String(line.qty_units))}{line.returned_weight_lb != null ? ` / ${line.returned_weight_lb} lb` : ""}</td><td className="px-4 py-3">{line.return_reason}</td><td className="px-4 py-3">{line.disposition === "pending" ? <div className="space-y-2"><form action={disposeReturnLine.bind(null, line.id)} className="flex gap-2"><input type="hidden" name="disposition" value="restock" /><Select name="target_location_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.returns.restockLocation")}</option>{(locations ?? []).map((location) => <option key={location.id} value={location.id}>{location.code} · {location.type}</option>)}</Select><Button type="submit" size="sm">{t(messages, "pg.returns.restock")}</Button></form><form action={disposeReturnLine.bind(null, line.id)}><input type="hidden" name="disposition" value="scrap" /><Button type="submit" variant="danger" size="sm">{t(messages, "pg.returns.scrap")}</Button></form></div> : <Badge tone="ok">{line.disposition}</Badge>}</td></tr>;
      })}{!lines?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.returns.noDispositionPending")}</td></tr>}</tbody>
    </table></div>
  </div>;
}
