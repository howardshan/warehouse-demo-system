"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { withdrawPickList } from "@/app/actions/warehouse";
import { useI18n } from "@/components/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type PickRow = {
  id: string;
  pick_number: string;
  status: string;
  created_at: string | null;
  so_number: string;
  customer_name: string;
  delivery_date: string | null;
};

function badgeTone(status: string) {
  if (status === "shipped") return "ok" as const;
  if (status === "cancelled") return "neutral" as const;
  return "warn" as const;
}

export function PickListsBrowser({ picks }: { picks: PickRow[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const statuses = useMemo(
    () => [...new Set(picks.map((p) => p.status))].sort(),
    [picks],
  );

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return picks.filter((p) => {
      if (status && p.status !== status) return false;
      if (!kw) return true;
      return (
        p.pick_number.toLowerCase().includes(kw) ||
        p.so_number.toLowerCase().includes(kw) ||
        p.customer_name.toLowerCase().includes(kw)
      );
    });
  }, [picks, q, status]);

  return (
    <div className="space-y-3">
      {/* 搜索 + 状态筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("pg.warehouse.searchPlaceholder")}
          className="min-w-[220px] flex-1"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-auto min-w-[150px]"
        >
          <option value="">{t("pg.warehouse.allStatus")}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <span className="text-xs text-stone-400">
          {t("pg.warehouse.resultCount").replace("{n}", String(filtered.length))}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t("pg.warehouse.colPickNo")}</th>
              <th className="px-4 py-3 font-medium">{t("pg.warehouse.colSoNo")}</th>
              <th className="px-4 py-3 font-medium">{t("pg.warehouse.colCustomer")}</th>
              <th className="px-4 py-3 font-medium">{t("pg.warehouse.genTime")}</th>
              <th className="px-4 py-3 font-medium">{t("pg.warehouse.deliveryTime")}</th>
              <th className="px-4 py-3 font-medium">{t("pg.warehouse.statusFilter")}</th>
              <th className="px-4 py-3 text-right font-medium">
                {t("pg.warehouse.colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pick) => {
              const active = !["shipped", "cancelled"].includes(pick.status);
              const isOpen = expanded === pick.id;
              return (
                <Fragment key={pick.id}>
                  <tr className="border-t border-stone-100 align-middle">
                    <td className="px-4 py-3">
                      <Link
                        href="/warehouse/picking"
                        className="font-mono text-teal-800 hover:underline"
                      >
                        {pick.pick_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">
                      {pick.so_number}
                    </td>
                    <td className="px-4 py-3">{pick.customer_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                      {pick.created_at
                        ? new Date(pick.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                      {pick.delivery_date ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={badgeTone(pick.status)}>{pick.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {active ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="whitespace-nowrap text-red-700 hover:bg-red-50"
                          onClick={() => setExpanded(isOpen ? null : pick.id)}
                        >
                          {t("pg.warehouse.withdraw")}
                        </Button>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                  </tr>
                  {active && isOpen && (
                    <tr className="border-t border-stone-100 bg-stone-50/60">
                      <td colSpan={7} className="px-4 py-3">
                        <form
                          action={withdrawPickList.bind(null, pick.id)}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <Input
                            name="reason"
                            required
                            placeholder={t("pg.warehouse.withdrawReason")}
                            className="min-w-[220px] flex-1"
                          />
                          <Button
                            type="submit"
                            variant="danger"
                            size="sm"
                            className="shrink-0 whitespace-nowrap"
                          >
                            {t("pg.warehouse.confirmWithdraw")}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-stone-400">
                  {t("pg.warehouse.noMatch")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
