import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function CreditNoteQueuePage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("v_credit_note_queue")
    .select("return_note_id, customer_id, credit_amount, reason").order("credit_amount", { ascending: false });
  const customerIds = [...new Set((rows ?? []).map((row) => row.customer_id).filter(Boolean))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, code, name").in("id", customerIds)
    : { data: [] };
  const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer]));
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">贷项通知单队列</h1><p className="mt-1 text-sm text-stone-500">已收货或已处置退货按原发运价格快照计算待开贷项金额。</p></div>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">退货单</th><th className="px-4 py-3">客户</th><th className="px-4 py-3">原因</th><th className="px-4 py-3 text-right">贷项金额</th><th className="px-4 py-3">状态</th></tr></thead>
      <tbody>{(rows ?? []).map((row) => {
        const customer = customerMap.get(row.customer_id);
        return <tr key={row.return_note_id} className="border-t border-stone-100"><td className="px-4 py-3"><Link href={`/returns/return-notes/${row.return_note_id}`} className="font-mono text-teal-800 hover:underline">{String(row.return_note_id).slice(0, 8)}</Link></td><td className="px-4 py-3">{customer?.code} · {customer?.name}</td><td className="px-4 py-3">{row.reason}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(Number(row.credit_amount))}</td><td className="px-4 py-3"><Badge tone="warn">待开贷项</Badge></td></tr>;
      })}{!rows?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">贷项通知单队列为空</td></tr>}</tbody>
    </table></div>
  </div>;
}
