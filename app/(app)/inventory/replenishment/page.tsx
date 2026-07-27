import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import {
  CompleteReplenishmentButton,
  ReplenishmentCreateForm,
} from "../inventory-forms";

export default async function ReplenishmentPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: tasks }, { data: products }, { data: pickLocations }] = await Promise.all([
    supabase
      .from("replenishment_tasks")
      .select("id, qty_units, qty_weight_lb, status, reason, created_at, products(sku, name), batches(lot_no, expiry_date), from:locations!replenishment_tasks_from_location_id_fkey(code), to:locations!replenishment_tasks_to_location_id_fkey(code)")
      .order("created_at", { ascending: false }),
    supabase.from("products").select("id, sku, name").eq("is_active", true).order("sku"),
    supabase.from("locations").select("id, code").eq("type", "pick_face").eq("is_active", true).order("code"),
  ]);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">{t(messages, "pg.inventory.replenishmentTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.inventory.replenishmentDesc")}</p></div>
      <ReplenishmentCreateForm products={(products ?? []).map((product) => ({ id: product.id, label: `${product.sku} · ${product.name}` }))} pickLocations={(pickLocations ?? []).map((location) => ({ id: location.id, label: location.code }))} />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.inventory.colProduct")}</th><th className="px-4 py-3">{t(messages, "pg.inventory.colLotExpiry2")}</th><th className="px-4 py-3">{t(messages, "pg.inventory.colPath")}</th><th className="px-4 py-3">{t(messages, "pg.inventory.colQty")}</th><th className="px-4 py-3">{t(messages, "pg.inventory.colStatus")}</th><th className="px-4 py-3">{t(messages, "pg.inventory.colAction")}</th></tr></thead>
          <tbody>
            {(tasks ?? []).map((task) => {
              const product = Array.isArray(task.products) ? task.products[0] : task.products;
              const batch = Array.isArray(task.batches) ? task.batches[0] : task.batches;
              const from = Array.isArray(task.from) ? task.from[0] : task.from;
              const to = Array.isArray(task.to) ? task.to[0] : task.to;
              return <tr key={task.id} className="border-t border-stone-100"><td className="px-4 py-3">{product?.name}<div className="font-mono text-xs text-stone-400">{product?.sku}</div></td><td className="px-4 py-3 font-mono text-xs">{batch?.lot_no}<div className="text-stone-400">{batch?.expiry_date ?? t(messages, "pg.inventory.noExpiry")}</div></td><td className="px-4 py-3 font-mono text-xs">{from?.code} → {to?.code}</td><td className="px-4 py-3 tabular-nums">{t(messages, "pg.inventory.unitsWeightLb").replace("{u}", String(task.qty_units)).replace("{w}", String(task.qty_weight_lb))}</td><td className="px-4 py-3"><Badge tone={task.status === "completed" ? "ok" : "warn"}>{task.status}</Badge></td><td className="px-4 py-3">{["open", "in_progress"].includes(task.status) ? <CompleteReplenishmentButton taskId={task.id} /> : "—"}</td></tr>;
            })}
            {!tasks?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.inventory.emptyReplenishment")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
