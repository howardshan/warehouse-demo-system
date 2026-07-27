"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/components/i18n/provider";
import { formatMoney } from "@/lib/utils";

export type HistoryItem = {
  sku: string;
  name: string;
  lastDate: string | null;
  lastQty: number;
  lastPrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
  atp: number;
};

type Tab = "last_sold" | "hist_price" | "in_stock";

const TABS: { key: Tab; label: string }[] = [
  { key: "last_sold", label: "Last Sold" },
  { key: "hist_price", label: "Hist. Price" },
  { key: "in_stock", label: "In Stock" },
];

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return d.slice(0, 10);
}

export function CustomerHistoryTabs({ items }: { items: HistoryItem[] }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("last_sold");

  const inStock = [...items].sort((a, b) => b.atp - a.atp);

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex gap-1">
          {TABS.map((tItem) => (
            <button
              key={tItem.key}
              type="button"
              onClick={() => setTab(tItem.key)}
              className={
                "rounded-t-md border-b-2 px-3 py-1.5 text-sm transition " +
                (tab === tItem.key
                  ? "border-teal-600 font-medium text-teal-800"
                  : "border-transparent text-stone-500 hover:text-stone-800")
              }
            >
              {tItem.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardBody className="px-0 pt-0">
        {items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-stone-400">{t("pg.sales.assistant.noDeals")}</p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-sm">
              {tab === "last_sold" && (
                <>
                  <thead className="sticky top-0 bg-stone-50 text-xs text-stone-500">
                    <tr>
                      <th className="px-3 py-2">Item#</th>
                      <th className="px-3 py-2">{t("pg.sales.assistant.colDesc")}</th>
                      <th className="px-3 py-2 text-right">{t("pg.sales.assistant.colSoldDate")}</th>
                      <th className="px-3 py-2 text-right">{t("pg.sales.assistant.colQty")}</th>
                      <th className="px-3 py-2 text-right">{t("pg.sales.assistant.colPrice")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.sku} className="border-t border-stone-100">
                        <td className="px-3 py-2 font-medium text-stone-700">
                          {it.sku}
                        </td>
                        <td className="px-3 py-2 text-stone-600">{it.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-stone-500">
                          {fmtDate(it.lastDate)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {it.lastQty.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(it.lastPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {tab === "hist_price" && (
                <>
                  <thead className="sticky top-0 bg-stone-50 text-xs text-stone-500">
                    <tr>
                      <th className="px-3 py-2">Item#</th>
                      <th className="px-3 py-2">{t("pg.sales.assistant.colDesc")}</th>
                      <th className="px-3 py-2 text-right">{t("pg.sales.assistant.colLastPrice")}</th>
                      <th className="px-3 py-2 text-right">{t("pg.sales.assistant.colRange")}</th>
                      <th className="px-3 py-2 text-right">{t("pg.sales.assistant.colDealCount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.sku} className="border-t border-stone-100">
                        <td className="px-3 py-2 font-medium text-stone-700">
                          {it.sku}
                        </td>
                        <td className="px-3 py-2 text-stone-600">{it.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(it.lastPrice)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-stone-500">
                          {formatMoney(it.minPrice)}–{formatMoney(it.maxPrice)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-stone-500">
                          {it.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {tab === "in_stock" && (
                <>
                  <thead className="sticky top-0 bg-stone-50 text-xs text-stone-500">
                    <tr>
                      <th className="px-3 py-2">Item#</th>
                      <th className="px-3 py-2">{t("pg.sales.assistant.colDesc")}</th>
                      <th className="px-3 py-2 text-right">{t("pg.sales.assistant.colInStock")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inStock.map((it) => (
                      <tr key={it.sku} className="border-t border-stone-100">
                        <td className="px-3 py-2 font-medium text-stone-700">
                          {it.sku}
                        </td>
                        <td className="px-3 py-2 text-stone-600">{it.name}</td>
                        <td
                          className={
                            "px-3 py-2 text-right tabular-nums " +
                            (it.atp <= 0 ? "text-red-600" : "text-stone-800")
                          }
                        >
                          {it.atp.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
