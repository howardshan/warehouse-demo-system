import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { BlindReceivingForm } from "../../purchasing-forms";

export default async function GoodsReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: receipt }, { data: lines }] = await Promise.all([
    supabase
      .from("goods_receipts")
      .select("id, gr_number, status, received_at, supplier_document_no, purchase_orders(po_number, suppliers(name))")
      .eq("id", id)
      .maybeSingle(),
    // 铁律 13：该查询刻意不选择 ordered_units，避免数据进入收货页面组件树。
    supabase
      .from("gr_lines")
      .select("id, supplier_claimed_units, actual_units, actual_weight_lb, lot_no, expiry_date, variance_reason, notes, po_lines(products(sku, name))")
      .eq("goods_receipt_id", id)
      .order("line_no"),
  ]);
  if (!receipt) notFound();
  const po = Array.isArray(receipt.purchase_orders) ? receipt.purchase_orders[0] : receipt.purchase_orders;
  const supplier = po && (Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">盲收 {receipt.gr_number}</h1><p className="mt-1 text-sm text-stone-500">{supplier?.name ?? "—"} · {receipt.supplier_document_no || "无送货单号"} · 采购单 {po?.po_number}</p></div>
        <Badge tone={receipt.status === "posted" || receipt.status === "matched" ? "ok" : receipt.status === "discrepancy" ? "danger" : "neutral"}>{receipt.status}</Badge>
      </div>
      <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">请独立录入供应商声称数量与现场清点数量。为保证盲收，本页不展示采购订购数量。</div>
      <BlindReceivingForm
        receiptId={id}
        status={receipt.status}
        lines={(lines ?? []).map((line) => {
          const poLine = Array.isArray(line.po_lines) ? line.po_lines[0] : line.po_lines;
          const product = poLine && (Array.isArray(poLine.products) ? poLine.products[0] : poLine.products);
          return {
            id: line.id,
            sku: product?.sku ?? "—",
            productName: product?.name ?? "未知商品",
            supplier_claimed_units: Number(line.supplier_claimed_units),
            actual_units: Number(line.actual_units),
            actual_weight_lb: Number(line.actual_weight_lb),
            lot_no: line.lot_no,
            expiry_date: line.expiry_date,
            variance_reason: line.variance_reason,
            notes: line.notes,
          };
        })}
      />
    </div>
  );
}
