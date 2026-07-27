import { recordPick } from "@/app/actions/warehouse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

const reasons = ["out_of_stock", "stock_mismatch", "quality_reject", "near_expiry", "underweight", "customer_cancelled", "other"];

export default async function PickingPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: lines }, { data: totes }] = await Promise.all([
    supabase.from("pick_list_lines").select(
      "id, requested_units, picked_units, variance_reason, pick_lists!inner(pick_number, status), so_lines!inner(line_no, products(code, name)), batches(lot_no), locations(code)",
    ).in("pick_lists.status", ["created", "picking"]).order("created_at"),
    supabase.from("totes").select("id, code").eq("status", "available").order("code"),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.warehouse.pickingStep")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.warehouse.pickingSubtitle")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.warehouse.linesToPick")}</h2></CardHeader><CardBody className="space-y-3">
      {(lines ?? []).map((line) => {
        const pick = line.pick_lists as unknown as { pick_number: string; status: string };
        const soLine = line.so_lines as unknown as { line_no: number; products: { code: string; name: string } };
        const batch = line.batches as unknown as { lot_no: string };
        const location = line.locations as unknown as { code: string };
        return <form key={line.id} action={recordPick.bind(null, line.id)} className="grid items-end gap-3 rounded border border-stone-100 p-4 md:grid-cols-6">
          <div className="md:col-span-2"><div className="font-medium">{soLine.products.code} · {soLine.products.name}</div><div className="text-xs text-stone-500">{pick.pick_number} · {t(messages, "pg.warehouse.lineLabel").replace("{x}", String(soLine.line_no))} · {t(messages, "pg.warehouse.locationLabel").replace("{x}", location.code)} · {t(messages, "pg.warehouse.batchLabel").replace("{x}", batch.lot_no)}</div></div>
          <div><Label>{t(messages, "pg.warehouse.requestedUnits")}</Label><div className="h-10 py-2 font-semibold">{line.requested_units}</div></div>
          <div><Label>{t(messages, "pg.warehouse.pickedUnits")}</Label><Input name="picked_units" type="number" step="0.01" min="0" defaultValue={line.picked_units ?? line.requested_units} required /></div>
          <div><Label>{t(messages, "pg.warehouse.tote")}</Label><Select name="tote_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.warehouse.scanOrSelect")}</option>{(totes ?? []).map((tote) => <option key={tote.id} value={tote.id}>{tote.code}</option>)}</Select></div>
          <div><Label>{t(messages, "pg.warehouse.varianceReason")}</Label><Select name="variance_reason" defaultValue=""><option value="">{t(messages, "pg.warehouse.noVariance")}</option>{reasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</Select></div>
          <div className="md:col-span-6"><Button type="submit" size="sm">{t(messages, "pg.warehouse.confirmPick")}</Button> <Badge className="ml-2">{pick.status}</Badge></div>
        </form>;
      })}
      {!lines?.length && <p className="text-sm text-stone-400">{t(messages, "pg.warehouse.noLinesToPick")}</p>}
    </CardBody></Card>
  </div>;
}
