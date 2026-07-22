import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { statusLabel } from "@/lib/i18n/status";
import { SupplierDeliveryNoteForm } from "../../../purchasing-forms";
import { ReceivingWorkflowNav } from "../../receiving-workflow-nav";

export default async function DeliveryNotePage({
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
        "id, gr_number, status, supplier_document_no, purchase_orders(po_number, suppliers(name))",
      )
      .eq("id", id)
      .maybeSingle(),
    // 铁律 13：不选择 ordered_units / actual_* / invoice，与盲收互不可见
    supabase
      .from("gr_lines")
      .select("id, supplier_claimed_units, po_lines(products(sku, name))")
      .eq("goods_receipt_id", id)
      .order("line_no"),
  ]);
  if (!receipt) notFound();
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
    return {
      id: line.id,
      sku: product?.sku ?? "—",
      productName: product?.name ?? "未知商品",
      supplier_claimed_units: Number(line.supplier_claimed_units),
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
            ← 收货列表
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            Shipping List {receipt.gr_number}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {supplier?.name ?? "—"} ·{" "}
            {receipt.supplier_document_no || "无送货单号"} · 采购单{" "}
            {po?.po_number}
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

      <ReceivingWorkflowNav receiptId={id} active="shipping" />

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        按纸质/电子 Shipping List（送货单）录入单号与声称件数。本页不展示现场实收、Invoice，也不展示采购订购数量。
      </div>

      <SupplierDeliveryNoteForm
        receiptId={id}
        status={receipt.status}
        supplierDocumentNo={receipt.supplier_document_no}
        lines={mappedLines}
      />
    </div>
  );
}
