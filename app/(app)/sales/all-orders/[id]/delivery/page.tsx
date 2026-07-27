import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { PrintAndMark } from "../print-and-mark";

export default async function DeliveryNotePrint({
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
      .select("so_number, customer_name_snapshot, delivery_address_snapshot, order_date")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("so_lines")
      .select("line_no, qty_units, products(sku, name)")
      .eq("sales_order_id", id)
      .order("line_no"),
  ]);
  if (!order) notFound();

  return (
    <div className="print-area mx-auto max-w-3xl bg-white p-8 text-stone-900">
      <PrintAndMark orderId={id} kind="delivery" />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {t(messages, "pg.allOrders.deliveryTitle")}
          </h1>
          <div className="mt-1 font-mono text-sm">{order.so_number}</div>
        </div>
        <div className="text-right text-sm">
          <div>{t(messages, "pg.allOrders.orderDate")}: {order.order_date}</div>
        </div>
      </div>

      <div className="mb-4 text-sm">
        <div className="font-semibold">{order.customer_name_snapshot}</div>
        <div className="text-stone-600">
          {t(messages, "pg.allOrders.deliverTo")}: {order.delivery_address_snapshot}
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-stone-800 text-left">
            <th className="py-2 w-10">#</th>
            <th className="py-2">{t(messages, "pg.allOrders.product")}</th>
            <th className="py-2 text-right">{t(messages, "pg.allOrders.qty")}</th>
          </tr>
        </thead>
        <tbody>
          {(lines ?? []).map((l) => {
            const p = Array.isArray(l.products) ? l.products[0] : l.products;
            return (
              <tr key={l.line_no} className="border-b border-stone-200">
                <td className="py-2">{l.line_no}</td>
                <td className="py-2">
                  <span className="font-mono text-xs">{p?.sku}</span> · {p?.name}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {Number(l.qty_units)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
