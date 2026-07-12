import { recordWeight } from "@/app/actions/warehouse";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

export default async function WeighingPage() {
  const supabase = await createClient();
  const { data: lines } = await supabase.from("pick_list_lines").select(
    "id, tote_id, picked_units, actual_weight_lb, pick_lists!inner(pick_number, status), so_lines!inner(is_catch_weight_snapshot, products(code, name)), totes(code)",
  ).eq("pick_lists.status", "picked_pending_weight").eq("so_lines.is_catch_weight_snapshot", true).order("picked_at");
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">称重步骤 ②</h1><p className="mt-1 text-sm text-stone-500">按周转筐扫描录入实重；称重品禁止用平均重量代替实重。</p></div>
    <Card><CardHeader><h2 className="font-semibold">待称重周转筐</h2></CardHeader><CardBody className="space-y-3">
      {(lines ?? []).map((line) => {
        const pick = line.pick_lists as unknown as { pick_number: string };
        const soLine = line.so_lines as unknown as { products: { code: string; name: string } };
        const tote = line.totes as unknown as { code: string } | null;
        return <form key={line.id} action={recordWeight.bind(null, line.id)} className="grid items-end gap-3 rounded border border-stone-100 p-4 md:grid-cols-5">
          <div className="md:col-span-2"><div className="font-medium">{soLine.products.code} · {soLine.products.name}</div><div className="text-xs text-stone-500">{pick.pick_number} · {line.picked_units} 件</div></div>
          <div><Label>周转筐码</Label><Input name="tote_id" defaultValue={line.tote_id ?? ""} placeholder={tote?.code ?? "扫描筐码"} required /></div>
          <div><Label>实重 (lb)</Label><Input name="actual_weight_lb" type="number" min="0" step="0.01" defaultValue={line.actual_weight_lb ?? ""} required /></div>
          <Button type="submit">确认称重</Button>
        </form>;
      })}
      {!lines?.length && <p className="text-sm text-stone-400">没有待称重明细</p>}
    </CardBody></Card>
  </div>;
}
