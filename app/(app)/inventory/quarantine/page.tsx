import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";

export default async function QuarantinePage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: stock } = await supabase
    .from("stock")
    .select("id, qty_units, qty_weight_lb, locations!inner(code, type), batches(lot_no, expiry_date, status, products(sku, name))")
    .eq("locations.type", "quarantine")
    .or("qty_units.gt.0,qty_weight_lb.gt.0")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">{t(messages, "pg.inventory.quarantineTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.inventory.quarantineDesc")}</p></div>
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.inventory.colProduct")}</th><th className="px-4 py-3">{t(messages, "pg.inventory.colQuarantineLocation")}</th><th className="px-4 py-3">LOT</th><th className="px-4 py-3">{t(messages, "pg.inventory.colExpiry")}</th><th className="px-4 py-3">{t(messages, "pg.inventory.colUnits")}</th><th className="px-4 py-3">{t(messages, "pg.inventory.colWeight")}</th><th className="px-4 py-3">{t(messages, "pg.inventory.colBatchStatus")}</th></tr></thead>
          <tbody>
            {(stock ?? []).map((row) => {
              const location = Array.isArray(row.locations) ? row.locations[0] : row.locations;
              const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches;
              const product = batch && (Array.isArray(batch.products) ? batch.products[0] : batch.products);
              return <tr key={row.id} className="border-t border-stone-100"><td className="px-4 py-3">{product?.name}<div className="font-mono text-xs text-stone-400">{product?.sku}</div></td><td className="px-4 py-3 font-mono text-xs">{location?.code}</td><td className="px-4 py-3 font-mono text-xs">{batch?.lot_no}</td><td className="px-4 py-3">{batch?.expiry_date ?? "—"}</td><td className="px-4 py-3 tabular-nums">{row.qty_units}</td><td className="px-4 py-3 tabular-nums">{row.qty_weight_lb} lb</td><td className="px-4 py-3"><Badge tone={batch?.status === "blocked" ? "danger" : "warn"}>{batch?.status}</Badge></td></tr>;
            })}
            {!stock?.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.inventory.emptyQuarantine")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
