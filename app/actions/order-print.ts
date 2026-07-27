"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** 标记订单某单据已打印（下货单 / invoice） */
export async function markOrderPrinted(
  orderId: string,
  kind: "delivery" | "invoice",
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  const col =
    kind === "delivery" ? "delivery_note_printed_at" : "invoice_printed_at";
  const { error } = await supabase
    .from("sales_orders")
    .update({ [col]: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath("/sales/all-orders");
  revalidatePath(`/sales/all-orders/${orderId}`);
}
