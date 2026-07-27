import { listPriceAlerts } from "@/app/actions/purchasing";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/utils";
import { AlertActions } from "../purchasing-forms";

export default async function PriceAlertsPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const alerts = await listPriceAlerts();
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">{t(messages, "pg.purchasing.priceAlerts")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.purchasing.priceAlertsDesc")}</p></div>
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.purchasing.product")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.previousCost")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.newCost")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.increasePct")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.currentPrice")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.impliedMargin")}</th><th className="px-4 py-3">{t(messages, "pg.purchasing.actions")}</th></tr></thead>
          <tbody>
            {alerts.map((alert) => {
              const product = Array.isArray(alert.products) ? alert.products[0] : alert.products;
              return <tr key={alert.id} className="border-t border-stone-100"><td className="px-4 py-3">{product?.name}<div className="font-mono text-xs text-stone-400">{product?.sku}</div></td><td className="px-4 py-3 tabular-nums">{formatMoney(Number(alert.previous_cost))}</td><td className="px-4 py-3 tabular-nums">{formatMoney(Number(alert.new_cost))}</td><td className="px-4 py-3"><Badge tone="danger">+{Number(alert.cost_increase_pct).toFixed(1)}%</Badge></td><td className="px-4 py-3 tabular-nums">{formatMoney(Number(alert.current_price))}</td><td className="px-4 py-3 tabular-nums">{alert.implied_margin_pct == null ? "—" : `${Number(alert.implied_margin_pct).toFixed(1)}%`}</td><td className="px-4 py-3"><AlertActions alertId={alert.id} /></td></tr>;
            })}
            {!alerts.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.purchasing.noPendingAlerts")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
