import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { statusLabel } from "@/lib/i18n/status";
import { SupplierInvoiceForm } from "../../../purchasing-forms";
import { ReceivingWorkflowNav } from "../../receiving-workflow-nav";
import { getReceivingProgress } from "../../progress";

export default async function SupplierInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: receipt }, { data: lines }] = await Promise.all([
    supabase
      .from("goods_receipts")
      .select(
        "id, gr_number, status, supplier_invoice_no, purchase_orders(po_number, suppliers(name))",
      )
      .eq("id", id)
      .maybeSingle(),
    // 铁律 13：不选择 ordered / shipping claimed / actual
    supabase
      .from("gr_lines")
      .select(
        "id, invoice_claimed_units, invoice_claimed_weight_lb, po_lines(products(sku, name, is_catch_weight, product_families(is_catch_weight)))",
      )
      .eq("goods_receipt_id", id)
      .order("line_no"),
  ]);
  if (!receipt) notFound();
  const progress = await getReceivingProgress(id);
  const po = Array.isArray(receipt.purchase_orders)
    ? receipt.purchase_orders[0]
    : receipt.purchase_orders;
  const supplier =
    po && (Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers);

  const mappedLines = (lines ?? []).map((line) => {
    const poLine = Array.isArray(line.po_lines) ? line.po_lines[0] : line.po_lines;
    const product =
      poLine &&
      (Array.isArray(poLine.products) ? poLine.products[0] : poLine.products);
    const family = product
      ? Array.isArray(product.product_families)
        ? product.product_families[0]
        : product.product_families
      : null;
    return {
      id: line.id,
      sku: product?.sku ?? "—",
      productName: product?.name ?? t(messages, "pg.receiving.unknownProduct"),
      invoice_claimed_units: Number(line.invoice_claimed_units),
      invoice_claimed_weight_lb:
        line.invoice_claimed_weight_lb == null
          ? null
          : Number(line.invoice_claimed_weight_lb),
      is_catch_weight: Boolean(
        family?.is_catch_weight ?? product?.is_catch_weight,
      ),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/purchasing/receiving"
            className="text-sm text-stone-500 hover:text-stone-800"
          >
            ← {t(messages, "pg.receiving.backToList")}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {t(messages, "pg.receiving.stepInvoice")} {receipt.gr_number}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {supplier?.name ?? "—"} ·{" "}
            {receipt.supplier_invoice_no ||
              t(messages, "pg.receiving.noInvoiceNo")}{" "}
            · {t(messages, "pg.receiving.poLabel")} {po?.po_number}
          </p>
        </div>
        <Badge
          tone={
            receipt.status === "posted" || receipt.status === "matched"
              ? "ok"
              : receipt.status === "discrepancy"
                ? "danger"
                : "neutral"
          }
        >
          {statusLabel(messages, "gr", receipt.status)}
        </Badge>
      </div>

      <ReceivingWorkflowNav receiptId={id} active="invoice" completed={progress} />

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {t(messages, "pg.receiving.invoiceHint")}
      </div>

      <SupplierInvoiceForm
        receiptId={id}
        status={receipt.status}
        supplierInvoiceNo={receipt.supplier_invoice_no}
        lines={mappedLines}
      />
    </div>
  );
}
