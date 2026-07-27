import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/utils";
import { PrintAndMark } from "../print-and-mark";

export default async function InvoicePrint({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  const [{ data: order }, { data: lines }] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("so_number, customer_name_snapshot, delivery_address_snapshot, order_date, payment_terms_days_snapshot")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("so_lines")
      .select("line_no, qty_units, estimated_weight_lb, unit_price, is_catch_weight_snapshot, products(sku, name)")
      .eq("sales_order_id", id)
      .order("line_no"),
  ]);
  if (!order) notFound();

  const rows = (lines ?? []).map((l) => {
    const p = Array.isArray(l.products) ? l.products[0] : l.products;
    const qty = l.is_catch_weight_snapshot
      ? Number(l.estimated_weight_lb ?? 0)
      : Number(l.qty_units);
    const amount = qty * Number(l.unit_price);
    return {
      lineNo: l.line_no,
      sku: p?.sku ?? "",
      name: p?.name ?? "",
      qty: Number(l.qty_units),
      unitPrice: Number(l.unit_price),
      amount,
    };
  });
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="print-area mx-auto max-w-3xl bg-white p-8 text-stone-900">
      <PrintAndMark orderId={id} kind="invoice" />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{t(messages, "pg.allOrders.invoiceTitle")}</h1>
          <div className="mt-1 font-mono text-sm">{order.so_number}</div>
        </div>
        <div className="text-right text-sm">
          <div>{t(messages, "pg.allOrders.orderDate")}: {order.order_date}</div>
          <div className="text-stone-500">Net {order.payment_terms_days_snapshot}</div>
        </div>
      </div>

      <div className="mb-4 text-sm">
        <div className="font-semibold">{order.customer_name_snapshot}</div>
        <div className="text-stone-600">{order.delivery_address_snapshot}</div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-stone-800 text-left">
            <th className="py-2 w-10">#</th>
            <th className="py-2">{t(messages, "pg.allOrders.product")}</th>
            <th className="py-2 text-right">{t(messages, "pg.allOrders.qty")}</th>
            <th className="py-2 text-right">{t(messages, "pg.allOrders.unitPrice")}</th>
            <th className="py-2 text-right">{t(messages, "pg.allOrders.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lineNo} className="border-b border-stone-200">
              <td className="py-2">{r.lineNo}</td>
              <td className="py-2">
                <span className="font-mono text-xs">{r.sku}</span> · {r.name}
              </td>
              <td className="py-2 text-right tabular-nums">{r.qty}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(r.unitPrice)}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="flex w-64 justify-between border-t-2 border-stone-800 pt-2 text-sm">
          <span className="font-semibold">{t(messages, "pg.allOrders.total")}</span>
          <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
        </div>
      </div>
    </div>
  );
}
