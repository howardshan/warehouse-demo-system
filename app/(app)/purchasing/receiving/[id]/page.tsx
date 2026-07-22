import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { statusLabel } from "@/lib/i18n/status";
import { BlindReceivingForm } from "../../purchasing-forms";
import { ReceivingWorkflowNav } from "../receiving-workflow-nav";

export default async function BlindReceivingPage({
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
        "id, gr_number, status, received_at, supplier_document_no, purchase_orders(po_number, suppliers(name))",
      )
      .eq("id", id)
      .maybeSingle(),
    // 铁律 13：不选择 ordered_units / supplier_claimed_units / invoice
    supabase
      .from("gr_lines")
      .select(
        "id, actual_units, actual_weight_lb, lot_no, expiry_date, notes, po_lines(products(sku, name, is_catch_weight, product_families(is_catch_weight)))",
      )
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
    const family = product
      ? Array.isArray(product.product_families)
        ? product.product_families[0]
        : product.product_families
      : null;
    return {
      id: line.id,
      sku: product?.sku ?? "—",
      productName: product?.name ?? "未知商品",
      actual_units: Number(line.actual_units),
      actual_weight_lb: Number(line.actual_weight_lb),
      lot_no: line.lot_no,
      expiry_date: line.expiry_date,
      notes: line.notes,
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
            ← 收货列表
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            现场盲收 {receipt.gr_number}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {supplier?.name ?? "—"} · 采购单 {po?.po_number}
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

      <ReceivingWorkflowNav receiptId={id} active="blind" />

      <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        只清点实收件数、重量与批号。本页不展示采购订购数量，也不展示 Shipping List /
        Invoice 声称数量。
        <span className="ml-1">
          标 <span className="text-red-600">*</span> 为必填。
        </span>
      </div>

      <BlindReceivingForm
        receiptId={id}
        status={receipt.status}
        lines={mappedLines}
      />
    </div>
  );
}
