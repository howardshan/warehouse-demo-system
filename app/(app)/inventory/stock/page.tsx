import { listAtp, listStock } from "@/app/actions/inventory";
import { Badge } from "@/components/ui/badge";

export default async function StockPage() {
  const [stock, atp] = await Promise.all([listStock(), listAtp()]);
  const atpMap = new Map(atp.map((row) => [row.product_id, row]));
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">库存余额</h1><p className="mt-1 text-sm text-stone-500">按储位和批次展示实物库存、占用量与商品 ATP。</p></div>
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">商品</th><th className="px-4 py-3">储位</th><th className="px-4 py-3">LOT / 效期</th><th className="px-4 py-3">在手件数</th><th className="px-4 py-3">在手重量</th><th className="px-4 py-3">占用件数</th><th className="px-4 py-3">ATP 件数</th><th className="px-4 py-3">ATP 重量</th></tr></thead>
          <tbody>
            {stock.map((row) => {
              const location = Array.isArray(row.locations) ? row.locations[0] : row.locations;
              const batch = Array.isArray(row.batches) ? row.batches[0] : row.batches;
              const product = batch && (Array.isArray(batch.products) ? batch.products[0] : batch.products);
              const productAtp = product ? atpMap.get(product.id) : undefined;
              return <tr key={row.id} className="border-t border-stone-100"><td className="px-4 py-3">{product?.name}<div className="font-mono text-xs text-stone-400">{product?.sku}</div></td><td className="px-4 py-3"><span className="font-mono text-xs">{location?.code}</span> <Badge className="ml-1">{location?.type}</Badge></td><td className="px-4 py-3"><span className="font-mono text-xs">{batch?.lot_no}</span><div className="text-xs text-stone-400">{batch?.expiry_date ?? "无效期"}</div></td><td className="px-4 py-3 tabular-nums">{row.qty_units}</td><td className="px-4 py-3 tabular-nums">{row.qty_weight_lb} lb</td><td className="px-4 py-3 tabular-nums">{row.allocated_units}</td><td className="px-4 py-3 tabular-nums">{productAtp?.atp_units ?? "—"}</td><td className="px-4 py-3 tabular-nums">{productAtp?.atp_weight_lb ?? "—"}</td></tr>;
            })}
            {!stock.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-stone-400">暂无库存</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
