import { recordPick } from "@/app/actions/warehouse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";

const reasons = ["out_of_stock", "stock_mismatch", "quality_reject", "near_expiry", "underweight", "customer_cancelled", "other"];

export default async function PickingPage() {
  const supabase = await createClient();
  const [{ data: lines }, { data: totes }] = await Promise.all([
    supabase.from("pick_list_lines").select(
      "id, requested_units, picked_units, variance_reason, pick_lists!inner(pick_number, status), so_lines!inner(line_no, products(code, name)), batches(lot_no), locations(code)",
    ).in("pick_lists.status", ["created", "picking"]).order("created_at"),
    supabase.from("totes").select("id, code").eq("status", "available").order("code"),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">拣货步骤 ①</h1><p className="mt-1 text-sm text-stone-500">扫描批次与周转筐，记录实拣件数；数量差异必须选择原因（铁律 14）。</p></div>
    <Card><CardHeader><h2 className="font-semibold">待拣明细</h2></CardHeader><CardBody className="space-y-3">
      {(lines ?? []).map((line) => {
        const pick = line.pick_lists as unknown as { pick_number: string; status: string };
        const soLine = line.so_lines as unknown as { line_no: number; products: { code: string; name: string } };
        const batch = line.batches as unknown as { lot_no: string };
        const location = line.locations as unknown as { code: string };
        return <form key={line.id} action={recordPick.bind(null, line.id)} className="grid items-end gap-3 rounded border border-stone-100 p-4 md:grid-cols-6">
          <div className="md:col-span-2"><div className="font-medium">{soLine.products.code} · {soLine.products.name}</div><div className="text-xs text-stone-500">{pick.pick_number} · 行 {soLine.line_no} · 储位 {location.code} · 批号 {batch.lot_no}</div></div>
          <div><Label>要求件数</Label><div className="h-10 py-2 font-semibold">{line.requested_units}</div></div>
          <div><Label>实拣件数</Label><Input name="picked_units" type="number" step="0.01" min="0" defaultValue={line.picked_units ?? line.requested_units} required /></div>
          <div><Label>周转筐</Label><Select name="tote_id" required defaultValue=""><option value="" disabled>扫描 / 选择</option>{(totes ?? []).map((tote) => <option key={tote.id} value={tote.id}>{tote.code}</option>)}</Select></div>
          <div><Label>差异原因</Label><Select name="variance_reason" defaultValue=""><option value="">无差异</option>{reasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</Select></div>
          <div className="md:col-span-6"><Button type="submit" size="sm">确认实拣</Button> <Badge className="ml-2">{pick.status}</Badge></div>
        </form>;
      })}
      {!lines?.length && <p className="text-sm text-stone-400">没有待拣明细</p>}
    </CardBody></Card>
  </div>;
}
