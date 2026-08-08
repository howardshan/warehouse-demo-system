"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type StockRow = {
  productId: string;
  sku: string;
  name: string;
  onHandUnits: number;
  onHandWeight: number;
  allocatedUnits: number;
  locationCount: number;
  tempZone: string | null;
  atpUnits: number | null;
  atpWeight: number | null;
};

export function StockBrowser({ rows }: { rows: StockRow[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [zone, setZone] = useState("");

  const zones = useMemo(
    () =>
      [...new Set(rows.map((r) => r.tempZone).filter(Boolean))].sort() as string[],
    [rows],
  );

  const zoneLabel = (z: string) => {
    const key =
      z === "ambient"
        ? "pg.inventory.zoneAmbient"
        : z === "chilled"
          ? "pg.inventory.zoneChilled"
          : z === "frozen"
            ? "pg.inventory.zoneFrozen"
            : null;
    return key ? t(key) : z;
  };

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (zone && r.tempZone !== zone) return false;
      if (!kw) return true;
      return (
        r.name.toLowerCase().includes(kw) || r.sku.toLowerCase().includes(kw)
      );
    });
  }, [rows, q, zone]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("pg.inventory.searchStockPlaceholder")}
          className="max-w-xs"
        />
        <Select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="max-w-[10rem]"
        >
          <option value="">{t("pg.inventory.zoneAll")}</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {zoneLabel(z)}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-sm text-stone-500">
          {t("pg.inventory.resultCount")
            .replace("{m}", String(filtered.length))
            .replace("{n}", String(rows.length))}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {t("pg.inventory.colProduct")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("pg.inventory.colLocations")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("pg.inventory.colOnHandUnits")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("pg.inventory.colOnHandWeight")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("pg.inventory.colAllocatedUnits")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("pg.inventory.colAtpUnits")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("pg.inventory.colAtpWeight")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.productId}
                  className="border-b border-stone-100 last:border-0 even:bg-stone-50/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/inventory/stock/${r.productId}`}
                      className="font-medium text-teal-800 hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="font-mono text-xs text-stone-400">
                      {r.sku}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.locationCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.onHandUnits}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.onHandWeight > 0 ? `${r.onHandWeight} lb` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.allocatedUnits}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.atpUnits ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.atpWeight != null && r.atpWeight > 0
                      ? `${r.atpWeight} lb`
                      : "—"}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-stone-400"
                  >
                    {t("pg.inventory.emptyStock")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
