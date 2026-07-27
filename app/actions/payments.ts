"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return { supabase, user };
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

async function prepaidBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
): Promise<number> {
  const { data } = await supabase
    .from("v_customer_prepaid")
    .select("prepaid_balance")
    .eq("customer_id", customerId)
    .maybeSingle();
  return Number(data?.prepaid_balance ?? 0);
}

async function slRemaining(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shippingListId: string,
): Promise<{ customerId: string; balance: number } | null> {
  const { data } = await supabase
    .from("v_sl_payment")
    .select("customer_id, balance_amount")
    .eq("shipping_list_id", shippingListId)
    .maybeSingle();
  if (!data) return null;
  return {
    customerId: data.customer_id as string,
    balance: Number(data.balance_amount),
  };
}

/** 单笔：对某发运单登记付款（金额留空=付清剩余；可勾选从预存款扣） */
export async function recordPayment(
  shippingListId: string,
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireUser();
  const info = await slRemaining(supabase, shippingListId);
  if (!info) throw new Error("找不到该发运单");
  if (info.balance <= 0) return; // 已付清

  const raw = String(formData.get("amount") || "").trim();
  let amount = raw === "" ? info.balance : money(Number(raw));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("金额无效");
  if (amount > info.balance) amount = info.balance; // 不允许超付

  const fromPrepaid = formData.get("from_prepaid") != null;
  if (fromPrepaid) {
    const bal = await prepaidBalance(supabase, info.customerId);
    if (bal < amount) throw new Error(`预存余额不足（余额 ${bal.toFixed(2)}）`);
  }

  const { error } = await supabase.from("customer_payments").insert({
    customer_id: info.customerId,
    shipping_list_id: shippingListId,
    kind: "order_payment",
    amount,
    from_prepaid: fromPrepaid,
    method: String(formData.get("method") || "") || null,
    note: String(formData.get("note") || "") || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/finance/payments/${info.customerId}`);
  revalidatePath("/finance/payments");
}

/** 批量：把选中的发运单全部按剩余应收付清（可从预存款扣） */
export async function markPaidBulk(
  customerId: string,
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireUser();
  const ids = formData.getAll("sl").map(String).filter(Boolean);
  if (ids.length === 0) return;
  const fromPrepaid = formData.get("from_prepaid") != null;

  const { data: rows } = await supabase
    .from("v_sl_payment")
    .select("shipping_list_id, balance_amount")
    .in("shipping_list_id", ids);
  const targets = (rows ?? [])
    .map((r) => ({
      id: r.shipping_list_id as string,
      bal: money(Number(r.balance_amount)),
    }))
    .filter((r) => r.bal > 0);
  if (targets.length === 0) return;

  if (fromPrepaid) {
    const total = money(targets.reduce((s, t) => s + t.bal, 0));
    const bal = await prepaidBalance(supabase, customerId);
    if (bal < total)
      throw new Error(
        `预存余额不足（需 ${total.toFixed(2)}，余 ${bal.toFixed(2)}）`,
      );
  }

  const { error } = await supabase.from("customer_payments").insert(
    targets.map((t) => ({
      customer_id: customerId,
      shipping_list_id: t.id,
      kind: "order_payment",
      amount: t.bal,
      from_prepaid: fromPrepaid,
      method: "batch",
    })),
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/finance/payments/${customerId}`);
  revalidatePath("/finance/payments");
}

/** 预存款充值 */
export async function topupPrepaid(
  customerId: string,
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireUser();
  const amount = money(Number(formData.get("amount")));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("充值金额无效");
  const { error } = await supabase.from("customer_payments").insert({
    customer_id: customerId,
    kind: "prepaid_topup",
    amount,
    method: String(formData.get("method") || "") || null,
    note: String(formData.get("note") || "") || null,
  });
  if (error) throw new Error(error.message);
  // 充值后按 FIFO 自动抵扣现有未付单
  await supabase.rpc("fn_apply_prepaid", { p_customer: customerId });
  revalidatePath(`/finance/payments/${customerId}`);
  revalidatePath("/finance/payments");
}

/** 收款：输入总额 + 付款方式，按 FIFO 分配到最早未付单，超出部分转入预存款 */
export async function applyReceipt(
  customerId: string,
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireUser();
  const amount = money(Number(formData.get("amount")));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("收款金额无效");

  const method = String(formData.get("method") || "cash");
  const checkNo = String(formData.get("check_no") || "").trim() || null;
  const achTxnNo = String(formData.get("ach_txn_no") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;

  if (method === "check" && !checkNo) throw new Error("请填写支票号");
  if (method === "ach" && !achTxnNo) throw new Error("请填写 ACH 交易号");

  // 支票正面图片上传（存 storage，记 path）
  let proofUrl: string | null = null;
  const proof = formData.get("proof");
  if (method === "check" && proof instanceof File && proof.size > 0) {
    const ext = (proof.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${customerId}/${randomUUID()}.${ext}`;
    const service = createServiceClient();
    const { error: upErr } = await service.storage
      .from("payment-proofs")
      .upload(path, proof, { contentType: proof.type || "image/jpeg" });
    if (upErr) throw new Error(`支票图片上传失败：${upErr.message}`);
    proofUrl = path;
  }

  const meta = {
    method,
    check_no: checkNo,
    ach_txn_no: achTxnNo,
    proof_url: proofUrl,
    note,
  };

  // FIFO：最早未付单先付，逐单全额，最后一单可部分
  const { data: rows } = await supabase
    .from("v_sl_payment")
    .select("shipping_list_id, balance_amount, signed_at")
    .eq("customer_id", customerId)
    .gt("balance_amount", 0)
    .order("signed_at", { ascending: true });

  const inserts: Record<string, unknown>[] = [];
  let remaining = amount;
  for (const r of rows ?? []) {
    if (remaining <= 0) break;
    const bal = money(Number(r.balance_amount));
    const pay = money(Math.min(remaining, bal));
    if (pay <= 0) continue;
    inserts.push({
      customer_id: customerId,
      shipping_list_id: r.shipping_list_id,
      kind: "order_payment",
      amount: pay,
      from_prepaid: false,
      ...meta,
    });
    remaining = money(remaining - pay);
  }
  // 超出未付总额的部分转入预存款
  if (remaining > 0) {
    inserts.push({
      customer_id: customerId,
      kind: "prepaid_topup",
      amount: remaining,
      ...meta,
    });
  }
  if (inserts.length === 0) return;

  const { error } = await supabase.from("customer_payments").insert(inserts);
  if (error) throw new Error(error.message);
  revalidatePath(`/finance/payments/${customerId}`);
  revalidatePath("/finance/payments");
}

/** 生成支票凭证的临时可访问链接 */
export async function getProofUrl(path: string): Promise<string | null> {
  await requireUser();
  const service = createServiceClient();
  const { data } = await service.storage
    .from("payment-proofs")
    .createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

/** 预存款退款（从余额中扣） */
export async function refundPrepaid(
  customerId: string,
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireUser();
  const amount = money(Number(formData.get("amount")));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("退款金额无效");
  const bal = await prepaidBalance(supabase, customerId);
  if (bal < amount) throw new Error(`预存余额不足（余额 ${bal.toFixed(2)}）`);
  const { error } = await supabase.from("customer_payments").insert({
    customer_id: customerId,
    kind: "prepaid_refund",
    amount,
    note: String(formData.get("note") || "") || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/finance/payments/${customerId}`);
  revalidatePath("/finance/payments");
}
