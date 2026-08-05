import { createClient } from "@/lib/supabase/server";

export type ReceivingStep = "blind" | "shipping" | "invoice" | "match";
export type ReceivingProgress = Record<ReceivingStep, boolean>;

/**
 * 计算收货四步录入进度，仅用于导航打勾提示，不作为业务闸门
 * （真正的校验仍在 submitGoodsReceipt / postGoodsReceipt 里）。
 * - blind：所有明细已录批号（不再是占位 __PENDING__）
 * - shipping：所有明细已录 Shipping List 声称件数
 * - invoice：所有明细已录 Invoice 声称件数，且已填发票号
 * - match：收货单已提交核对（状态离开 draft）
 */
export async function getReceivingProgress(
  receiptId: string,
): Promise<ReceivingProgress> {
  const supabase = await createClient();
  const [{ data: receipt }, { data: lines }] = await Promise.all([
    supabase
      .from("goods_receipts")
      .select("status, supplier_invoice_no")
      .eq("id", receiptId)
      .maybeSingle(),
    supabase
      .from("gr_lines")
      .select("lot_no, supplier_claimed_units, invoice_claimed_units")
      .eq("goods_receipt_id", receiptId),
  ]);
  const rows = lines ?? [];
  const hasLines = rows.length > 0;
  return {
    blind:
      hasLines && rows.every((r) => r.lot_no && r.lot_no !== "__PENDING__"),
    shipping:
      hasLines && rows.every((r) => Number(r.supplier_claimed_units) > 0),
    invoice:
      hasLines &&
      rows.every((r) => Number(r.invoice_claimed_units) > 0) &&
      Boolean(receipt?.supplier_invoice_no?.trim()),
    match: Boolean(receipt && receipt.status !== "draft"),
  };
}
