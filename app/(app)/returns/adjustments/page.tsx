import { createDeliveryAdjustment } from "@/app/actions/returns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function DeliveryAdjustmentsPage() {
  const supabase = await createClient();
  const [{ data: adjustments }, { data: shipping }, { data: returns }] = await Promise.all([
    supabase.from("delivery_adjustments")
      .select("id, adjustment_type, qty_units, adjusted_weight_lb, amount, responsibility, reason, approved_at, created_at, shipping_lists(sl_number), return_notes(return_number)")
      .order("created_at", { ascending: false }),
    supabase.from("shipping_lists").select("id, sl_number").in("status", ["released", "in_transit", "signed", "adjusted"]).order("created_at", { ascending: false }),
    supabase.from("return_notes").select("id, return_number").order("created_at", { ascending: false }),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">配送调整（路线 B）</h1><p className="mt-1 text-sm text-stone-500">短送、重量修正或损坏独立登记，不改写原发运行快照。</p></div>
    <Card><CardHeader><h2 className="font-semibold">新增调整</h2></CardHeader><CardBody><form action={createDeliveryAdjustment} className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      <Select name="shipping_list_id" required defaultValue=""><option value="" disabled>发运单</option>{(shipping ?? []).map((sl) => <option key={sl.id} value={sl.id}>{sl.sl_number}</option>)}</Select>
      <Select name="return_note_id" defaultValue=""><option value="">不关联退货单</option>{(returns ?? []).map((note) => <option key={note.id} value={note.id}>{note.return_number}</option>)}</Select>
      <Select name="adjustment_type" defaultValue="short_delivery"><option value="short_delivery">短送</option><option value="over_delivery">多送</option><option value="weight_correction">重量修正</option><option value="damage">破损</option><option value="other">其他</option></Select>
      <Select name="responsibility" defaultValue="under_investigation"><option value="under_investigation">责任调查中</option><option value="ours">我方责任</option><option value="customer">客户责任</option></Select>
      <Input name="qty_units" type="number" step="0.001" defaultValue="0" placeholder="件数差异" />
      <Input name="adjusted_weight_lb" type="number" step="0.001" defaultValue="0" placeholder="重量差异 lb" />
      <Input name="amount" type="number" step="0.01" defaultValue="0" placeholder="金额差异" />
      <Input name="reason" required placeholder="调整原因" />
      <Button type="submit" className="md:col-span-3 xl:col-span-4">创建配送调整</Button>
    </form></CardBody></Card>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">发运 / 退货</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">数量差异</th><th className="px-4 py-3">金额</th><th className="px-4 py-3">原因</th><th className="px-4 py-3">审批</th></tr></thead>
      <tbody>{(adjustments ?? []).map((row) => {
        const sl = Array.isArray(row.shipping_lists) ? row.shipping_lists[0] : row.shipping_lists;
        const note = Array.isArray(row.return_notes) ? row.return_notes[0] : row.return_notes;
        return <tr key={row.id} className="border-t border-stone-100"><td className="px-4 py-3">{sl?.sl_number}{note ? ` / ${note.return_number}` : ""}</td><td className="px-4 py-3">{row.adjustment_type}</td><td className="px-4 py-3">{row.qty_units} 件 / {row.adjusted_weight_lb} lb</td><td className="px-4 py-3">{formatMoney(Number(row.amount))}</td><td className="px-4 py-3">{row.reason}</td><td className="px-4 py-3"><Badge tone={row.approved_at ? "ok" : "warn"}>{row.approved_at ? "已审批" : "待审批"}</Badge></td></tr>;
      })}{!adjustments?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">暂无配送调整</td></tr>}</tbody>
    </table></div>
  </div>;
}
