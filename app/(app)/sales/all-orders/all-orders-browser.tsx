"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type AllOrderRow = {
  id: string;
  so_number: string;
  customer: string;
  orderDate: string;
  deliveryDate: string;
  status: string;
  payStatus: "paid" | "partial" | "unpaid" | null;
  deliveryPrinted: boolean;
  invoicePrinted: boolean;
};

function statusTone(status: string) {
  if (status === "confirmed" || status === "closed") return "ok" as const;
  if (status === "pending_approval" || status === "credit_hold")
    return "warn" as const;
  return "neutral" as const;
}

const payTone = { paid: "ok", partial: "warn", unpaid: "danger" } as const;
const payLabelKey = {
  paid: "pg.payments.statusPaid",
  partial: "pg.payments.statusPartial",
  unpaid: "pg.payments.statusUnpaid",
} as const;

export function AllOrdersBrowser({ orders }: { orders: AllOrderRow[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const statuses = useMemo(
    () => [...new Set(orders.map((o) => o.status))].sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status && o.status !== status) return false;
      if (!kw) return true;
      return (
        o.so_number.toLowerCase().includes(kw) ||
        o.customer.toLowerCase().includes(kw)
      );
    });
  }, [orders, q, status]);

  const printedBadge = (printed: boolean) =>
    printed ? (
      <Badge tone="ok">{t("pg.allOrders.printed")}</Badge>
    ) : (
      <Badge tone="warn">{t("pg.allOrders.notPrinted")}</Badge>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("pg.allOrders.searchPlaceholder")}
          className="max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-[11rem]"
        >
          <option value="">{t("pg.allOrders.statusAll")}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-sm text-stone-500">
          {t("pg.allOrders.resultCount")
            .replace("{m}", String(filtered.length))
            .replace("{n}", String(orders.length))}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {t("pg.allOrders.colOrderNo")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.allOrders.colCustomer")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.allOrders.colOrderDate")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.sales.orders.colDeliveryDate")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.allOrders.status")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.payments.payStatus")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.allOrders.deliveryNote")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("pg.allOrders.invoice")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-stone-100 last:border-0 even:bg-stone-50/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/all-orders/${o.id}`}
                      className="font-mono text-teal-800 hover:underline"
                    >
                      {o.so_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{o.customer}</td>
                  <td className="px-4 py-3 tabular-nums text-stone-600">
                    {o.orderDate}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-stone-600">
                    {o.deliveryDate}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {o.payStatus ? (
                      <Badge tone={payTone[o.payStatus]}>
                        {t(payLabelKey[o.payStatus])}
                      </Badge>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {printedBadge(o.deliveryPrinted)}
                  </td>
                  <td className="px-4 py-3">{printedBadge(o.invoicePrinted)}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-stone-400"
                  >
                    {t("pg.allOrders.empty")}
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
