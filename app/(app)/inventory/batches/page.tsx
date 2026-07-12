import { listBatches } from "@/app/actions/inventory";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export default async function BatchesPage() {
  const batches = await listBatches();
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">批次库存</h1><p className="mt-1 text-sm text-stone-500">按供应商 LOT 与效期追踪批次及入库成本。</p></div>
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">商品</th><th className="px-4 py-3">LOT</th><th className="px-4 py-3">来源</th><th className="px-4 py-3">效期</th><th className="px-4 py-3">单位成本</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">收货时间</th></tr></thead>
          <tbody>
            {batches.map((batch) => {
              const product = Array.isArray(batch.products) ? batch.products[0] : batch.products;
              const tone = batch.status === "available" ? "ok" : batch.status === "blocked" ? "danger" : batch.status === "quality_hold" ? "warn" : "neutral";
              return <tr key={batch.id} className="border-t border-stone-100"><td className="px-4 py-3">{product?.name}<div className="font-mono text-xs text-stone-400">{product?.sku}</div></td><td className="px-4 py-3 font-mono text-xs">{batch.lot_no}</td><td className="px-4 py-3">{batch.origin}</td><td className="px-4 py-3">{batch.expiry_date ?? "—"}</td><td className="px-4 py-3 tabular-nums">{formatMoney(Number(batch.unit_cost))}</td><td className="px-4 py-3"><Badge tone={tone}>{batch.status}</Badge></td><td className="px-4 py-3">{batch.received_at ? new Date(batch.received_at).toLocaleString("zh-CN") : "—"}</td></tr>;
            })}
            {!batches.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">暂无批次</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
