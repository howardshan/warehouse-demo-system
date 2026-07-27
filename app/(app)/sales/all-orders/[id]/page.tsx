import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function OrderPrintHub({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  const { data: order } = await supabase
    .from("sales_orders")
    .select(
      "so_number, customer_name_snapshot, delivery_address_snapshot, order_date, delivery_note_printed_at, invoice_printed_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const status = (printedAt: string | null) =>
    printedAt ? (
      <Badge tone="ok">{t(messages, "pg.allOrders.printed")}</Badge>
    ) : (
      <Badge tone="warn">{t(messages, "pg.allOrders.notPrinted")}</Badge>
    );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/sales/all-orders" className="text-sm text-teal-800 hover:underline">
          ← {t(messages, "pg.allOrders.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{order.so_number}</h1>
        <p className="text-sm text-stone-500">
          {order.customer_name_snapshot} · {order.order_date}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold">{t(messages, "pg.allOrders.deliveryNote")}</h2>
            {status(order.delivery_note_printed_at)}
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
            <h2 className="font-semibold">{t(messages, "pg.allOrders.invoice")}</h2>
            {status(order.invoice_printed_at)}
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
