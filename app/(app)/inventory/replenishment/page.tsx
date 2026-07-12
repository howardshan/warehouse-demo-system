import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  CompleteReplenishmentButton,
  ReplenishmentCreateForm,
} from "../inventory-forms";

export default async function ReplenishmentPage() {
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
      <div><h1 className="text-2xl font-semibold">FEFO 补货</h1><p className="mt-1 text-sm text-stone-500">系统从存储位自动选择效期最早的可用批次。</p></div>
      <ReplenishmentCreateForm products={(products ?? []).map((product) => ({ id: product.id, label: `${product.sku} · ${product.name}` }))} pickLocations={(pickLocations ?? []).map((location) => ({ id: location.id, label: location.code }))} />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">商品</th><th className="px-4 py-3">批号 / 效期</th><th className="px-4 py-3">路径</th><th className="px-4 py-3">数量</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">操作</th></tr></thead>
          <tbody>
            {(tasks ?? []).map((task) => {
              const product = Array.isArray(task.products) ? task.products[0] : task.products;
              const batch = Array.isArray(task.batches) ? task.batches[0] : task.batches;
              const from = Array.isArray(task.from) ? task.from[0] : task.from;
              const to = Array.isArray(task.to) ? task.to[0] : task.to;
              return <tr key={task.id} className="border-t border-stone-100"><td className="px-4 py-3">{product?.name}<div className="font-mono text-xs text-stone-400">{product?.sku}</div></td><td className="px-4 py-3 font-mono text-xs">{batch?.lot_no}<div className="text-stone-400">{batch?.expiry_date ?? "无效期"}</div></td><td className="px-4 py-3 font-mono text-xs">{from?.code} → {to?.code}</td><td className="px-4 py-3 tabular-nums">{task.qty_units} 件 / {task.qty_weight_lb} lb</td><td className="px-4 py-3"><Badge tone={task.status === "completed" ? "ok" : "warn"}>{task.status}</Badge></td><td className="px-4 py-3">{["open", "in_progress"].includes(task.status) ? <CompleteReplenishmentButton taskId={task.id} /> : "—"}</td></tr>;
            })}
            {!tasks?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">暂无补货任务</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
