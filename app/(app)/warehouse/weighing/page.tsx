import { recordWeight } from "@/app/actions/warehouse";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function WeighingPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: lines } = await supabase.from("pick_list_lines").select(
    "id, tote_id, picked_units, actual_weight_lb, pick_lists!inner(pick_number, status), so_lines!inner(is_catch_weight_snapshot, products(sku, name)), totes(code)",
  ).eq("pick_lists.status", "picked_pending_weight").eq("so_lines.is_catch_weight_snapshot", true).order("picked_at");
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.warehouse.weighingStep")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.warehouse.weighingSubtitle")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.warehouse.totesToWeigh")}</h2></CardHeader><CardBody className="space-y-3">
      {(lines ?? []).map((line) => {
        const pick = line.pick_lists as unknown as { pick_number: string };
        const soLine = line.so_lines as unknown as { products: { sku: string; name: string } };
        const tote = line.totes as unknown as { code: string } | null;
        return <form key={line.id} action={recordWeight.bind(null, line.id)} className="grid items-end gap-3 rounded border border-stone-100 p-4 md:grid-cols-5">
          <div className="md:col-span-2"><div className="font-medium">{soLine.products.sku} · {soLine.products.name}</div><div className="text-xs text-stone-500">{pick.pick_number} · {t(messages, "pg.warehouse.unitsSuffix").replace("{x}", String(line.picked_units))}</div></div>
          <div><Label>{t(messages, "pg.warehouse.toteCode")}</Label><Input name="tote_id" defaultValue={tote?.code ?? ""} placeholder={t(messages, "pg.warehouse.scanToteCode")} required /></div>
          <div><Label>{t(messages, "pg.warehouse.actualWeightLb")}</Label><Input name="actual_weight_lb" type="number" min="0" step="0.01" defaultValue={line.actual_weight_lb ?? ""} required /></div>
          <Button type="submit">{t(messages, "pg.warehouse.confirmWeigh")}</Button>
        </form>;
      })}
      {!lines?.length && <p className="text-sm text-stone-400">{t(messages, "pg.warehouse.noLinesToWeigh")}</p>}
    </CardBody></Card>
  </div>;
}
