"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type BatchRow = {
  id: string;
  sku: string;
  name: string;
  lot_no: string;
  origin: string;
  expiry: string;
  unitCost: string;
  status: string;
  receivedAt: string;
};

function statusTone(status: string) {
  if (status === "available") return "ok" as const;
  if (status === "blocked") return "danger" as const;
  if (status === "quality_hold") return "warn" as const;
  return "neutral" as const;
}

export function BatchesBrowser({ batches }: { batches: BatchRow[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");

  const statuses = useMemo(
    () => [...new Set(batches.map((b) => b.status))].sort(),
    [batches],
  );
  const origins = useMemo(
    () => [...new Set(batches.map((b) => b.origin))].sort(),
    [batches],
  );

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return batches.filter((b) => {
      if (status && b.status !== status) return false;
      if (origin && b.origin !== origin) return false;
      if (!kw) return true;
      return (
        b.name.toLowerCase().includes(kw) ||
        b.sku.toLowerCase().includes(kw) ||
        b.lot_no.toLowerCase().includes(kw)
      );
    });
  }, [batches, q, status, origin]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("pg.inventory.searchBatchPlaceholder")}
          className="max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-[11rem]"
        >
          <option value="">{t("pg.inventory.statusAll")}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="max-w-[11rem]"
        >
          <option value="">{t("pg.inventory.originAll")}</option>
          {origins.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-sm text-stone-500">
          {t("pg.inventory.resultCountBatches")
            .replace("{m}", String(filtered.length))
            .replace("{n}", String(batches.length))}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {t("pg.inventory.colProduct")}
                </th>
                <th className="px-4 py-3 font-medium">LOT</th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.inventory.colOrigin")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.inventory.colExpiry")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("pg.inventory.colUnitCost")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.inventory.colStatus")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.inventory.colReceivedAt")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-stone-100 last:border-0 even:bg-stone-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-800">{b.name}</div>
                    <div className="font-mono text-xs text-stone-400">
                      {b.sku}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{b.lot_no}</td>
                  <td className="px-4 py-3 text-stone-500">{b.origin}</td>
                  <td className="px-4 py-3">{b.expiry}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {b.unitCost}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{b.receivedAt}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-stone-400"
                  >
                    {t("pg.inventory.emptyBatches")}
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
