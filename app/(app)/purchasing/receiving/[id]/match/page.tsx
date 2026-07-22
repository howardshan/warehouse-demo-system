import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { statusLabel } from "@/lib/i18n/status";
import {
  isWeightVarianceOverThreshold,
  weightVariancePct,
} from "@/lib/domain/weight-variance";
import { ThreeWayMatchForm } from "../../../purchasing-forms";
import { ReceivingWorkflowNav } from "../../receiving-workflow-nav";

export default async function ThreeWayMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: receipt }, { data: lines }, { data: toleranceSetting }] =
    await Promise.all([
      supabase
        .from("goods_receipts")
        .select(
          "id, gr_number, status, supplier_document_no, supplier_invoice_no, purchase_orders(po_number, suppliers(name))",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("gr_lines")
        .select(
          "id, ordered_units, supplier_claimed_units, invoice_claimed_units, invoice_claimed_weight_lb, actual_units, actual_weight_lb, variance_reason, po_lines(products(sku, name, is_catch_weight, product_families(is_catch_weight)))",
        )
        .eq("goods_receipt_id", id)
        .order("line_no"),
      supabase
        .from("settings")
        .select("value")
        .eq("key", "receiving_weight_tolerance_pct")
        .maybeSingle(),
    ]);
  if (!receipt) notFound();
  const po = Array.isArray(receipt.purchase_orders)
    ? receipt.purchase_orders[0]
    : receipt.purchase_orders;
  const supplier =
    po && (Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers);

  const tolerancePct = Number(toleranceSetting?.value ?? 5);

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
    const isCatch = Boolean(
      family?.is_catch_weight ?? product?.is_catch_weight,
    );
    const invoiceWeight =
      line.invoice_claimed_weight_lb == null
        ? null
        : Number(line.invoice_claimed_weight_lb);
    const actualWeight = Number(line.actual_weight_lb);
    const variance =
      isCatch && invoiceWeight != null
        ? weightVariancePct(actualWeight, invoiceWeight)
        : null;
    const weightWarning =
      isCatch &&
      invoiceWeight != null &&
      isWeightVarianceOverThreshold(actualWeight, invoiceWeight, tolerancePct);

    return {
      id: line.id,
      sku: product?.sku ?? "—",
      productName: product?.name ?? "未知商品",
      ordered_units: Number(line.ordered_units),
      supplier_claimed_units: Number(line.supplier_claimed_units),
      invoice_claimed_units: Number(line.invoice_claimed_units),
      invoice_claimed_weight_lb: invoiceWeight,
      actual_units: Number(line.actual_units),
      actual_weight_lb: actualWeight,
      is_catch_weight: isCatch,
      variance_reason: line.variance_reason,
      weightWarning,
      weightVariancePct: variance,
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
            单据核对 {receipt.gr_number}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {supplier?.name ?? "—"} · SL{" "}
            {receipt.supplier_document_no || "—"} · INV{" "}
            {receipt.supplier_invoice_no || "—"} · 采购单 {po?.po_number}
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

      <ReceivingWorkflowNav receiptId={id} active="match" />

      <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        此处首次同时展示订购、Shipping List、Invoice 与现场实收。四方件数一致方可过账；实收
        / Shipping List / Invoice 不一致时须填写差异原因。称重品重量偏差超过{" "}
        {tolerancePct}%（设置项 receiving_weight_tolerance_pct）仅 warning，不阻断。
      </div>

      <ThreeWayMatchForm
        receiptId={id}
        status={receipt.status}
        lines={mappedLines}
      />
    </div>
  );
}
