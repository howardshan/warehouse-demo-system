import { listPriceAlerts } from "@/app/actions/purchasing";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { AlertActions } from "../purchasing-forms";

export default async function PriceAlertsPage() {
  const alerts = await listPriceAlerts();
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">成本涨价提醒</h1><p className="mt-1 text-sm text-stone-500">一键调价按新旧成本比例调整当前售价；铁律 1 保证历史成交价不被覆盖。</p></div>
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">商品</th><th className="px-4 py-3">原成本</th><th className="px-4 py-3">新成本</th><th className="px-4 py-3">涨幅</th><th className="px-4 py-3">当前售价</th><th className="px-4 py-3">隐含毛利</th><th className="px-4 py-3">操作</th></tr></thead>
          <tbody>
            {alerts.map((alert) => {
              const product = Array.isArray(alert.products) ? alert.products[0] : alert.products;
              return <tr key={alert.id} className="border-t border-stone-100"><td className="px-4 py-3">{product?.name}<div className="font-mono text-xs text-stone-400">{product?.sku}</div></td><td className="px-4 py-3 tabular-nums">{formatMoney(Number(alert.previous_cost))}</td><td className="px-4 py-3 tabular-nums">{formatMoney(Number(alert.new_cost))}</td><td className="px-4 py-3"><Badge tone="danger">+{Number(alert.cost_increase_pct).toFixed(1)}%</Badge></td><td className="px-4 py-3 tabular-nums">{formatMoney(Number(alert.current_price))}</td><td className="px-4 py-3 tabular-nums">{alert.implied_margin_pct == null ? "—" : `${Number(alert.implied_margin_pct).toFixed(1)}%`}</td><td className="px-4 py-3"><AlertActions alertId={alert.id} /></td></tr>;
            })}
            {!alerts.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">没有待处理提醒</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
