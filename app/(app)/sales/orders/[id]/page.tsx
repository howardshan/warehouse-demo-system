import Link from "next/link";
import { notFound } from "next/navigation";
import { requestMarginApproval } from "@/app/actions/sales";
import { generatePickList } from "@/app/actions/warehouse";
import {
  AddSoLineForm,
  ConfirmSoButton,
  SoLineEditor,
} from "../so-forms";
import { CustomerCreditPanel } from "./customer-assistant";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { calcMarginPct } from "@/lib/domain/margin";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-stone-800">{value}</dd>
    </div>
  );
}

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [
    { data: order },
    { data: lines },
    { data: products },
    { data: approvals },
    { data: atpRows },
  ] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("*, customers(code, legal_name, tax_id)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("so_lines")
      .select("*, products(sku, name)")
      .eq("sales_order_id", id)
      .order("line_no"),
    supabase
      .from("products")
      .select("id, sku, name, current_price, is_catch_weight")
      .eq("is_active", true)
      .eq("is_sellable", true)
      .order("sku"),
    supabase
      .from("so_approvals")
      .select("*")
      .eq("sales_order_id", id)
      .order("requested_at", { ascending: false }),
    supabase.from("v_atp").select("product_id, atp_units"),
  ]);
  if (!order) notFound();

  const atpMap = new Map(
    (atpRows ?? []).map((r) => [r.product_id, Number(r.atp_units)]),
  );
  const cust = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;
  const unlocked = !order.locked_at;
  const total = (lines ?? []).reduce(
    (sum, line) =>
      sum +
      Number(
        line.is_catch_weight_snapshot
          ? line.estimated_weight_lb
          : line.qty_units,
      ) *
        Number(line.unit_price),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sales/orders"
          className="text-sm text-teal-800 hover:underline"
        >
          ← {t(messages, "pg.sales.orders.title")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{order.so_number}</h1>
          <Badge>{order.status}</Badge>
          {order.locked_at && <Badge tone="warn">{t(messages, "pg.sales.orders.commercialLocked")}</Badge>}
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {order.customer_name_snapshot} · {order.delivery_address_snapshot}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">{t(messages, "pg.sales.orders.orderInfo")}</h2>
            <Badge>{order.status}</Badge>
          </div>
          <div className="text-sm text-stone-500">
            S/O #{" "}
            <span className="font-semibold text-stone-800">
              {order.so_number}
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <HeaderField label={t(messages, "pg.sales.orders.custNo")} value={cust?.code ?? "—"} />
            <HeaderField
              label={t(messages, "pg.sales.orders.terms")}
              value={`NET ${order.payment_terms_days_snapshot} DAYS`}
            />
            <HeaderField label={t(messages, "pg.sales.orders.taxId")} value={cust?.tax_id ?? "—"} />
            <HeaderField label={t(messages, "pg.sales.orders.orderDate")} value={order.order_date} />
            <HeaderField
              label={t(messages, "pg.sales.orders.shipDate")}
              value={order.requested_delivery_date ?? t(messages, "pg.sales.orders.unspecified")}
            />
            <HeaderField label={t(messages, "pg.sales.orders.salesRep")} value={order.sales_rep_id ? t(messages, "pg.sales.orders.assigned") : "—"} />
            <HeaderField label={t(messages, "pg.sales.orders.amount")} value={formatMoney(total)} />
            <HeaderField
              label={t(messages, "pg.sales.orders.creditSnapshot")}
              value={formatMoney(Number(order.credit_limit_snapshot))}
            />
            <HeaderField
              label={t(messages, "pg.sales.orders.lockedLabel")}
              value={order.locked_at ? t(messages, "pg.sales.orders.locked") : t(messages, "pg.sales.orders.no")}
            />
          </dl>
          <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-stone-400">
                {t(messages, "pg.sales.orders.billTo")}
              </div>
              <div className="mt-1 font-medium text-stone-800">
                {order.customer_name_snapshot}
              </div>
              {cust?.legal_name && (
                <div className="text-sm text-stone-500">{cust.legal_name}</div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-stone-400">
                {t(messages, "pg.sales.orders.shipTo")}
              </div>
              <div className="mt-1 whitespace-pre-line text-sm text-stone-700">
                {order.delivery_address_snapshot}
              </div>
            </div>
          </div>
          {order.notes && (
            <div className="border-t border-stone-100 pt-4">
              <div className="text-xs uppercase tracking-wide text-stone-400">
                {t(messages, "pg.sales.orders.notesLabel")}
              </div>
              <div className="mt-1 whitespace-pre-line text-sm text-stone-700">
                {order.notes}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {unlocked && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t(messages, "pg.sales.orders.addLine")}</h2>
            <p className="text-sm text-stone-500">
              {t(messages, "pg.sales.orders.addLineHint")}
            </p>
          </CardHeader>
          <CardBody>
            <AddSoLineForm
              salesOrderId={id}
              products={(products ?? []).map((p) => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                current_price: Number(p.current_price),
                is_catch_weight: p.is_catch_weight,
                atp_units: atpMap.get(p.id) ?? 0,
              }))}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold">{t(messages, "pg.sales.orders.orderLines")}</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {(lines ?? []).map((line) => {
            const product = Array.isArray(line.products)
              ? line.products[0]
              : line.products;
            const margin = calcMarginPct(
              Number(line.unit_price),
              Number(line.cost_snapshot),
            );
            return (
              <SoLineEditor
                key={line.id}
                salesOrderId={id}
                unlocked={unlocked}
                marginPct={margin}
                line={{
                  id: line.id,
                  qty_units: Number(line.qty_units),
                  estimated_weight_lb:
                    line.estimated_weight_lb == null
                      ? null
                      : Number(line.estimated_weight_lb),
                  unit_price: Number(line.unit_price),
                  cost_snapshot: Number(line.cost_snapshot),
                  allocated_units: Number(line.allocated_units),
                  is_catch_weight_snapshot: line.is_catch_weight_snapshot,
                  notes: line.notes,
                  products: product
                    ? { sku: product.sku, name: product.name }
                    : null,
                }}
              />
            );
          })}
          {!lines?.length && (
            <p className="text-sm text-stone-400">{t(messages, "pg.sales.orders.noLines")}</p>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3">
        {unlocked && !!lines?.length && <ConfirmSoButton salesOrderId={id} />}
        {unlocked && !!lines?.length && (
          <form
            action={requestMarginApproval.bind(null, id)}
            className="flex gap-2"
          >
            <Select name="approval_type" defaultValue="margin">
              <option value="margin">{t(messages, "pg.sales.orders.lowMargin")}</option>
              <option value="below_cost">{t(messages, "pg.sales.orders.belowCost")}</option>
            </Select>
            <Input name="reason" placeholder={t(messages, "pg.sales.orders.approvalReason")} required />
            <Button type="submit" variant="secondary">
              {t(messages, "pg.sales.orders.requestApproval")}
            </Button>
          </form>
        )}
        {order.status === "confirmed" && (
          <form action={generatePickList.bind(null, id)}>
            <Button type="submit" variant="secondary">
              {t(messages, "pg.sales.orders.genPickList")}
            </Button>
          </form>
        )}
      </div>

      {!!approvals?.length && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t(messages, "pg.sales.orders.approvalRecords")}</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {approvals.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b border-stone-100 py-2"
              >
                <span>
                  {item.approval_type} · {item.reason}
                </span>
                <Badge>{item.status}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
        </div>

        <aside className="space-y-6 lg:col-span-1">
          <CustomerCreditPanel customerId={order.customer_id} />
        </aside>
      </div>
    </div>
  );
}
