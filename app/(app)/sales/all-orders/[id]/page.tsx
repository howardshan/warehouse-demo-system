import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

function one<T>(v: unknown): T | null {
  const x = Array.isArray(v) ? v[0] : v;
  return (x ?? null) as T | null;
}

function statusTone(status: string) {
  if (status === "confirmed" || status === "closed") return "ok" as const;
  if (status === "pending_approval" || status === "credit_hold")
    return "warn" as const;
  return "neutral" as const;
}

export default async function OrderPrintHub({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  const [{ data: order }, { data: lines }, { data: payRows }] =
    await Promise.all([
      supabase
        .from("sales_orders")
        .select(
          "so_number, customer_name_snapshot, delivery_address_snapshot, status, order_date, requested_delivery_date, delivery_note_printed_at, invoice_printed_at",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("so_lines")
        .select(
          "id, line_no, qty_units, unit_price, is_catch_weight_snapshot, estimated_weight_lb, products(sku, name)",
        )
        .eq("sales_order_id", id)
        .order("line_no"),
      supabase
        .from("v_sl_payment")
        .select("paid_amount, balance_amount")
        .eq("sales_order_id", id),
    ]);
  if (!order) notFound();

  const printBadge = (printedAt: string | null) =>
    printedAt ? (
      <Badge tone="ok">{t(messages, "pg.allOrders.printed")}</Badge>
    ) : (
      <Badge tone="warn">{t(messages, "pg.allOrders.notPrinted")}</Badge>
    );

  // 付款状态（按发运单聚合）
  let payStatus: "paid" | "partial" | "unpaid" | null = null;
  if (payRows && payRows.length) {
    const paid = payRows.reduce((s, r) => s + Number(r.paid_amount), 0);
    const balance = payRows.reduce((s, r) => s + Number(r.balance_amount), 0);
    payStatus = balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
  }
  const payTone = { paid: "ok", partial: "warn", unpaid: "danger" } as const;
  const payLabelKey = {
    paid: "pg.payments.statusPaid",
    partial: "pg.payments.statusPartial",
    unpaid: "pg.payments.statusUnpaid",
  } as const;

  const rows = (lines ?? []).map((line) => {
    const product = one<{ sku: string; name: string }>(line.products);
    const cw = line.is_catch_weight_snapshot;
    const est = line.estimated_weight_lb == null ? null : Number(line.estimated_weight_lb);
    const qty = Number(line.qty_units);
    const price = Number(line.unit_price);
    const lineTotal = cw ? (est != null ? est * price : null) : qty * price;
    return {
      id: line.id,
      sku: product?.sku ?? "—",
      name: product?.name ?? "—",
      qty,
      cw,
      price,
      lineTotal,
    };
  });
  const total = rows.reduce((s, r) => s + (r.lineTotal ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sales/all-orders"
          className="text-sm text-teal-800 hover:underline"
        >
          ← {t(messages, "pg.allOrders.back")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{order.so_number}</h1>
          <Badge tone={statusTone(order.status)}>{order.status}</Badge>
          {payStatus && (
            <Badge tone={payTone[payStatus]}>
              {t(messages, payLabelKey[payStatus])}
            </Badge>
          )}
        </div>
        <p className="text-sm text-stone-500">{order.customer_name_snapshot}</p>
      </div>

      {/* 订单信息 */}
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs text-stone-500">
              {t(messages, "pg.allOrders.colCustomer")}
            </div>
            <div className="mt-1 text-sm font-medium">
              {order.customer_name_snapshot}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500">
              {t(messages, "pg.allOrders.deliverTo")}
            </div>
            <div className="mt-1 text-sm font-medium">
              {order.delivery_address_snapshot ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500">
              {t(messages, "pg.allOrders.orderDate")}
            </div>
            <div className="mt-1 text-sm font-medium tabular-nums">
              {order.order_date}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500">
              {t(messages, "pg.sales.orders.colDeliveryDate")}
            </div>
            <div className="mt-1 text-sm font-medium tabular-nums">
              {order.requested_delivery_date ?? "—"}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 订单明细 */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {t(messages, "pg.allOrders.linesTitle")}
          </h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">
                    {t(messages, "pg.allOrders.product")}
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    {t(messages, "pg.allOrders.qty")}
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    {t(messages, "pg.allOrders.unitPrice")}
                  </th>
                  <th className="py-2 text-right font-medium">
                    {t(messages, "pg.allOrders.amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-stone-100">
                    <td className="py-2 pr-4">
                      <span className="font-mono text-xs text-stone-500">
                        {r.sku}
                      </span>{" "}
                      · {r.name}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {r.qty}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatMoney(r.price)}
                      {r.cw ? <span className="text-stone-400"> /lb</span> : ""}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {r.lineTotal != null ? formatMoney(r.lineTotal) : "—"}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-stone-400"
                    >
                      —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right font-semibold">
            {t(messages, "pg.allOrders.total")}：{formatMoney(total)}
          </div>
        </CardBody>
      </Card>

      {/* 打印 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold">
              {t(messages, "pg.allOrders.deliveryNote")}
            </h2>
            {printBadge(order.delivery_note_printed_at)}
          </CardHeader>
          <CardBody>
            <Link
              href={`/sales/all-orders/${id}/delivery`}
              target="_blank"
              className="inline-flex items-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
            >
              {t(messages, "pg.allOrders.printDelivery")}
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold">
              {t(messages, "pg.allOrders.invoice")}
            </h2>
            {printBadge(order.invoice_printed_at)}
          </CardHeader>
          <CardBody>
            <Link
              href={`/sales/all-orders/${id}/invoice`}
              target="_blank"
              className="inline-flex items-center rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
            >
              {t(messages, "pg.allOrders.printInvoice")}
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
