"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";
import {
  markPaidBulk,
  recordPayment,
  topupPrepaid,
  refundPrepaid,
  applyReceipt,
  getProofUrl,
} from "@/app/actions/payments";

export type PayRow = {
  shippingListId: string;
  soNumber: string;
  date: string;
  due: number;
  paid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
};
export type MonthGroup = {
  ym: string;
  due: number;
  balance: number;
  rows: PayRow[];
};
export type LedgerRow = {
  id: string;
  kind: string;
  amount: number;
  fromPrepaid: boolean;
  method: string | null;
  note: string | null;
  paidAt: string;
  soNumber: string | null;
  proofUrl: string | null;
  checkNo: string | null;
  achTxnNo: string | null;
};

type Labels = Record<string, string>;

export function PaymentsCustomerClient({
  customerId,
  months,
  ledger,
  prepaidBalance,
  unpaidTotal,
  labels: L,
}: {
  customerId: string;
  months: MonthGroup[];
  ledger: LedgerRow[];
  prepaidBalance: number;
  unpaidTotal: number;
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [usePrepaid, setUsePrepaid] = useState(false);
  const [payOpen, setPayOpen] = useState<string | null>(null);

  const selectableIds = useMemo(
    () =>
      months.flatMap((m) =>
        m.rows.filter((r) => r.balance > 0).map((r) => r.shippingListId),
      ),
    [months],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleMonth(m: MonthGroup, on: boolean) {
    const ids = m.rows.filter((r) => r.balance > 0).map((r) => r.shippingListId);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function run(fn: () => Promise<void>) {
    setError(null);
    start(async () => {
      try {
        await fn();
        setSelected(new Set());
        setPayOpen(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "操作失败");
      }
    });
  }

  function doBulk() {
    if (selected.size === 0) return;
    const fd = new FormData();
    for (const id of selected) fd.append("sl", id);
    if (usePrepaid) fd.append("from_prepaid", "1");
    run(() => markPaidBulk(customerId, fd));
  }

  const selectedBalance = useMemo(() => {
    let s = 0;
    for (const m of months)
      for (const r of m.rows) if (selected.has(r.shippingListId)) s += r.balance;
    return s;
  }, [selected, months]);

  // 未付单按签收日期升序（FIFO）
  const unpaidAsc = useMemo(
    () =>
      months
        .flatMap((m) => m.rows)
        .filter((r) => r.balance > 0)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [months],
  );

  function printSelected() {
    const ids = selected.size > 0 ? [...selected] : unpaidAsc.map((r) => r.shippingListId);
    if (ids.length === 0) return;
    window.open(
      `/finance/payments/${customerId}/print?ids=${ids.join(",")}`,
      "_blank",
    );
  }

  const statusBadge = (st: PayRow["status"]) =>
    st === "paid" ? (
      <Badge tone="ok">{L.statusPaid}</Badge>
    ) : st === "partial" ? (
      <Badge tone="warn">{L.statusPartial}</Badge>
    ) : (
      <Badge tone="danger">{L.statusUnpaid}</Badge>
    );

  return (
    <div className="space-y-6">
      {/* 概览 + 预存款 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody className="space-y-1">
            <div className="text-xs text-stone-500">{L.unpaidTotal}</div>
            <div
              className={`text-2xl font-semibold tabular-nums ${
                unpaidTotal > 0 ? "text-red-600" : "text-teal-700"
              }`}
            >
              {formatMoney(unpaidTotal)}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-stone-500">{L.prepaidBalance}</span>
              <span className="text-2xl font-semibold tabular-nums text-teal-700">
                {formatMoney(prepaidBalance)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(() => topupPrepaid(customerId, fd));
                }}
                className="flex items-center gap-1"
              >
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder={L.amount}
                  className="h-8 w-24"
                />
                <Button size="sm" type="submit" disabled={pending}>
                  {L.topup}
                </Button>
              </form>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(() => refundPrepaid(customerId, fd));
                }}
                className="flex items-center gap-1"
              >
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder={L.amount}
                  className="h-8 w-24"
                />
                <Button size="sm" variant="secondary" type="submit" disabled={pending}>
                  {L.refund}
                </Button>
              </form>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 收款（FIFO 分配） */}
      <ReceiptPanel
        rows={unpaidAsc}
        L={L}
        pending={pending}
        onReceive={(fd) => run(() => applyReceipt(customerId, fd))}
      />

      {error && (
        <p className="whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* 批量工具条 */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-md border border-stone-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={
              selectableIds.length > 0 && selected.size === selectableIds.length
            }
            onChange={(e) =>
              setSelected(e.target.checked ? new Set(selectableIds) : new Set())
            }
          />
          {L.selectAll}
        </label>
        <span className="text-sm text-stone-500">
          {selected.size > 0
            ? L.selectedCount
                .replace("{n}", String(selected.size))
                .replace("{amount}", formatMoney(selectedBalance))
            : L.nothingSelected}
        </span>
        <label className="ml-auto flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={usePrepaid}
            onChange={(e) => setUsePrepaid(e.target.checked)}
          />
          {L.usePrepaid}（{formatMoney(prepaidBalance)}）
        </label>
        <Button
          size="sm"
          type="button"
          disabled={pending || selected.size === 0}
          onClick={doBulk}
        >
          {L.bulkMarkPaid}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          type="button"
          onClick={printSelected}
        >
          {L.printSelected}
        </Button>
      </div>

      {/* 按月分组 */}
      {months.map((m) => {
        const monthSelectable = m.rows.filter((r) => r.balance > 0);
        const allOn =
          monthSelectable.length > 0 &&
          monthSelectable.every((r) => selected.has(r.shippingListId));
        return (
          <Card key={m.ym}>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={allOn}
                  disabled={monthSelectable.length === 0}
                  onChange={(e) => toggleMonth(m, e.target.checked)}
                />
                {m.ym}
              </label>
              <span className="text-sm text-stone-500">
                {L.balanceCol}:{" "}
                <span
                  className={
                    m.balance > 0
                      ? "font-semibold text-red-600"
                      : "text-teal-700"
                  }
                >
                  {formatMoney(m.balance)}
                </span>{" "}
                / {formatMoney(m.due)}
              </span>
            </CardHeader>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th className="w-8 px-3 py-2"></th>
                    <th className="px-3 py-2">{L.order}</th>
                    <th className="px-3 py-2">{L.date}</th>
                    <th className="px-3 py-2 text-right">{L.due}</th>
                    <th className="px-3 py-2 text-right">{L.paid}</th>
                    <th className="px-3 py-2 text-right">{L.balanceCol}</th>
                    <th className="px-3 py-2">{L.status}</th>
                    <th className="px-3 py-2 text-right">{L.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {m.rows.map((r) => (
                    <PayRowView
                      key={r.shippingListId}
                      row={r}
                      L={L}
                      selected={selected.has(r.shippingListId)}
                      onToggle={() => toggle(r.shippingListId)}
                      badge={statusBadge(r.status)}
                      open={payOpen === r.shippingListId}
                      setOpen={(v) =>
                        setPayOpen(v ? r.shippingListId : null)
                      }
                      pending={pending}
                      onPay={(fd) => run(() => recordPayment(r.shippingListId, fd))}
                    />
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        );
      })}

      {/* 付款流水 */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">{L.ledgerTitle}</h2>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          {ledger.length === 0 ? (
            <p className="px-4 py-4 text-sm text-stone-400">{L.ledgerEmpty}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500">
                <tr>
                  <th className="px-3 py-2">{L.date}</th>
                  <th className="px-3 py-2">{L.status}</th>
                  <th className="px-3 py-2">{L.order}</th>
                  <th className="px-3 py-2 text-right">{L.amount}</th>
                  <th className="px-3 py-2">{L.method}</th>
                  <th className="px-3 py-2">{L.note}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-t border-stone-100">
                    <td className="px-3 py-2 tabular-nums text-stone-500">{l.paidAt}</td>
                    <td className="px-3 py-2">
                      {l.kind === "order_payment" ? (
                        <span>
                          {L.kindOrderPayment}
                          {l.fromPrepaid ? "（预存）" : ""}
                        </span>
                      ) : l.kind === "prepaid_topup" ? (
                        <Badge tone="ok">{L.kindTopup}</Badge>
                      ) : (
                        <Badge tone="warn">{L.kindRefund}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{l.soNumber ?? "—"}</td>
                    <td
                      className={
                        "px-3 py-2 text-right tabular-nums " +
                        (l.kind === "prepaid_refund" ? "text-amber-700" : "text-stone-800")
                      }
                    >
                      {l.kind === "prepaid_refund" ? "-" : ""}
                      {formatMoney(l.amount)}
                    </td>
                    <td className="px-3 py-2 text-stone-500">
                      {l.method ?? "—"}
                      {l.checkNo ? ` #${l.checkNo}` : ""}
                      {l.achTxnNo ? ` #${l.achTxnNo}` : ""}
                    </td>
                    <td className="px-3 py-2 text-stone-500">
                      {l.proofUrl ? (
                        <ProofLink path={l.proofUrl} label={L.proofView} />
                      ) : (
                        (l.note ?? "—")
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function ProofLink({ path, label }: { path: string; label: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      className="text-teal-800 hover:underline"
      onClick={async () => {
        setLoading(true);
        const url = await getProofUrl(path);
        setLoading(false);
        if (url) window.open(url, "_blank");
      }}
    >
      {label}
    </button>
  );
}

function ReceiptPanel({
  rows,
  L,
  pending,
  onReceive,
}: {
  rows: PayRow[];
  L: Labels;
  pending: boolean;
  onReceive: (fd: FormData) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const amt = Number(amount) || 0;

  const preview = useMemo(() => {
    let rem = amt;
    const alloc: { row: PayRow; pay: number; full: boolean }[] = [];
    for (const r of rows) {
      if (rem <= 0) break;
      const pay = Math.min(rem, r.balance);
      alloc.push({ row: r, pay, full: pay >= r.balance });
      rem = Math.round((rem - pay) * 100) / 100;
    }
    return { alloc, toPrepaid: Math.max(0, Math.round(rem * 100) / 100) };
  }, [amt, rows]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">{L.receiveTitle}</h2>
      </CardHeader>
      <CardBody>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onReceive(new FormData(e.currentTarget));
            e.currentTarget.reset();
            setAmount("");
            setMethod("cash");
          }}
          className="space-y-3"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-stone-500">
                {L.receiveAmount}
              </label>
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-500">
                {L.payMethod}
              </label>
              <select
                name="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-10 w-40 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              >
                <option value="cash">{L.methodCash}</option>
                <option value="check">{L.methodCheck}</option>
                <option value="ach">{L.methodAch}</option>
              </select>
            </div>
            {method === "check" && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-stone-500">
                    {L.checkNo}
                  </label>
                  <Input name="check_no" required className="w-36" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-stone-500">
                    {L.proofPhoto}
                  </label>
                  <input
                    type="file"
                    name="proof"
                    accept="image/*"
                    capture="environment"
                    className="block w-56 text-sm text-stone-600 file:mr-2 file:rounded file:border-0 file:bg-stone-100 file:px-2 file:py-1"
                  />
                </div>
              </>
            )}
            {method === "ach" && (
              <div>
                <label className="mb-1 block text-xs text-stone-500">
                  {L.achTxnNo}
                </label>
                <Input name="ach_txn_no" required className="w-44" />
              </div>
            )}
            <Button type="submit" disabled={pending || amt <= 0}>
              {L.receive}
            </Button>
          </div>

          {amt > 0 && (
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
              <div className="mb-1 text-xs text-stone-500">{L.allocPreview}</div>
              {preview.alloc.length === 0 ? (
                <div className="text-stone-400">{L.noUnpaid}</div>
              ) : (
                <ul className="space-y-0.5">
                  {preview.alloc.map((a) => (
                    <li
                      key={a.row.shippingListId}
                      className="flex justify-between"
                    >
                      <span className="font-mono text-xs">
                        {a.row.soNumber} · {a.row.date}
                      </span>
                      <span className="tabular-nums">
                        {L.willPay} {formatMoney(a.pay)}
                        {a.full ? "" : ` (${L.statusPartial})`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {preview.toPrepaid > 0 && (
                <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-medium text-teal-700">
                  <span>{L.toPrepaid}</span>
                  <span className="tabular-nums">
                    {formatMoney(preview.toPrepaid)}
                  </span>
                </div>
              )}
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}

function PayRowView({
  row: r,
  L,
  selected,
  onToggle,
  badge,
  open,
  setOpen,
  pending,
  onPay,
}: {
  row: PayRow;
  L: Labels;
  selected: boolean;
  onToggle: () => void;
  badge: ReactNode;
  open: boolean;
  setOpen: (v: boolean) => void;
  pending: boolean;
  onPay: (fd: FormData) => void;
}) {
  const done = r.balance <= 0;
  return (
    <>
      <tr className="border-t border-stone-100">
        <td className="px-3 py-2">
          <input
            type="checkbox"
            checked={selected}
            disabled={done}
            onChange={onToggle}
          />
        </td>
        <td className="px-3 py-2 font-mono text-xs">{r.soNumber}</td>
        <td className="px-3 py-2 tabular-nums text-stone-500">{r.date}</td>
        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(r.due)}</td>
        <td className="px-3 py-2 text-right tabular-nums text-stone-500">
          {formatMoney(r.paid)}
        </td>
        <td className="px-3 py-2 text-right tabular-nums font-medium">
          {r.balance > 0 ? (
            <span className="text-red-600">{formatMoney(r.balance)}</span>
          ) : (
            formatMoney(0)
          )}
        </td>
        <td className="px-3 py-2">{badge}</td>
        <td className="px-3 py-2 text-right">
          {!done && (
            <button
              type="button"
              className="text-sm text-teal-800 hover:underline"
              onClick={() => setOpen(!open)}
            >
              {L.pay}
            </button>
          )}
        </td>
      </tr>
      {open && !done && (
        <tr className="border-t border-stone-100 bg-stone-50/60">
          <td></td>
          <td colSpan={7} className="px-3 py-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onPay(new FormData(e.currentTarget));
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={r.balance}
                placeholder={`${L.payAmountPlaceholder} ${formatMoney(r.balance)}`}
                className="h-8 w-40"
              />
              <label className="flex items-center gap-1 text-sm text-stone-600">
                <input type="checkbox" name="from_prepaid" value="1" />
                {L.usePrepaid}
              </label>
              <Input name="method" placeholder={L.method} className="h-8 w-28" />
              <Button size="sm" type="submit" disabled={pending}>
                {L.confirm}
              </Button>
              <button
                type="button"
                className="text-sm text-stone-500 hover:underline"
                onClick={() => setOpen(false)}
              >
                {L.cancel}
              </button>
              <span className="text-xs text-stone-400">
                {L.payFull}: {formatMoney(r.balance)}
              </span>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
