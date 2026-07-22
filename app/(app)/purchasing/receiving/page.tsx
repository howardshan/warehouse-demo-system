import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { statusLabel } from "@/lib/i18n/status";
import { StartReceivingForm } from "../purchasing-forms";

export default async function ReceivingPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: receipts }, { data: purchaseOrders }] = await Promise.all([
    supabase
      .from("goods_receipts")
      .select(
        "id, gr_number, status, received_at, supplier_document_no, supplier_invoice_no, purchase_orders(po_number, suppliers(name))",
      )
      .order("received_at", { ascending: false }),
    supabase
      .from("purchase_orders")
      .select("id, po_number, suppliers(name)")
      .in("status", ["issued", "partially_received"])
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">采购收货</h1>
        <p className="mt-1 text-sm text-stone-500">
          流程：现场盲收 → Shipping List → Invoice →
          单据核对。各方数量分页录入、互不可见，仅在核对页汇合。
        </p>
      </div>
      <StartReceivingForm
        purchaseOrders={(purchaseOrders ?? []).map((po) => {
          const supplier = Array.isArray(po.suppliers)
            ? po.suppliers[0]
            : po.suppliers;
          return {
            id: po.id,
            label: `${po.po_number} · ${supplier?.name ?? "—"}`,
          };
        })}
      />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">收货单</th>
              <th className="px-4 py-3">采购单</th>
              <th className="px-4 py-3">供应商</th>
              <th className="px-4 py-3">Shipping List</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">收货时间</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {(receipts ?? []).map((receipt) => {
              const po = Array.isArray(receipt.purchase_orders)
                ? receipt.purchase_orders[0]
                : receipt.purchase_orders;
              const supplier =
                po &&
                (Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers);
              const tone =
                receipt.status === "posted" || receipt.status === "matched"
                  ? "ok"
                  : receipt.status === "discrepancy"
                    ? "danger"
                    : "neutral";
              return (
                <tr key={receipt.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-mono text-xs">
                    {receipt.gr_number}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {po?.po_number}
                  </td>
                  <td className="px-4 py-3">{supplier?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {receipt.supplier_document_no ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {receipt.supplier_invoice_no ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(receipt.received_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={tone}>
                      {statusLabel(messages, "gr", receipt.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      <Link
                        href={`/purchasing/receiving/${receipt.id}`}
                        className="font-medium text-teal-800 hover:underline"
                      >
                        盲收
                      </Link>
                      <Link
                        href={`/purchasing/receiving/${receipt.id}/delivery-note`}
                        className="font-medium text-teal-800 hover:underline"
                      >
                        Shipping List
                      </Link>
                      <Link
                        href={`/purchasing/receiving/${receipt.id}/invoice`}
                        className="font-medium text-teal-800 hover:underline"
                      >
                        Invoice
                      </Link>
                      <Link
                        href={`/purchasing/receiving/${receipt.id}/match`}
                        className="font-medium text-teal-800 hover:underline"
                      >
                        核对
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!receipts?.length && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-stone-400"
                >
                  暂无收货单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
