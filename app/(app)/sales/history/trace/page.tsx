import Link from "next/link";
import { traceByBatch } from "@/app/actions/repack";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function BatchTracePage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { batch = "" } = await searchParams;
  const rows = batch ? await traceByBatch(batch) : [];
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">批次全链路追溯</h1><p className="mt-1 text-sm text-stone-500">按批号或批次 UUID 查询采购、退货、重包形成的父子批次链。</p></div>
    <Card><CardHeader><h2 className="font-semibold">查询批次祖先链</h2></CardHeader><CardBody><form className="flex flex-wrap gap-3"><Input name="batch" defaultValue={batch} required placeholder="批号或批次 UUID" className="max-w-lg" /><Button type="submit">追溯</Button><Link href="/sales/history" className="inline-flex h-10 items-center text-sm text-teal-800 hover:underline">返回销售历史</Link></form></CardBody></Card>
    {!!batch && <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">层级</th><th className="px-4 py-3">当前批号</th><th className="px-4 py-3">当前来源</th><th className="px-4 py-3">祖先批号</th><th className="px-4 py-3">祖先来源</th><th className="px-4 py-3">祖先批次 ID</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={`${row.batch_id}-${row.ancestor_batch_id}`} className="border-t border-stone-100"><td className="px-4 py-3">{row.depth === 0 ? "本批次" : `上溯 ${row.depth} 层`}</td><td className="px-4 py-3 font-mono">{row.lot_no}</td><td className="px-4 py-3">{row.origin}</td><td className="px-4 py-3 font-mono">{row.ancestor_lot_no}</td><td className="px-4 py-3">{row.ancestor_origin}</td><td className="px-4 py-3 font-mono text-xs text-stone-500">{row.ancestor_batch_id}</td></tr>)}{!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">未找到可追溯批次</td></tr>}</tbody>
    </table></div>}
  </div>;
}
