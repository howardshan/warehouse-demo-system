"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  customerSchema,
  locationSchema,
  productSchema,
  supplierSchema,
  toteSchema,
} from "@/lib/domain/schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登录");
  return { supabase, user };
}

export async function createProduct(raw: unknown) {
  const parsed = productSchema.parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("products").insert({
    ...parsed,
    avg_weight_lb: parsed.is_catch_weight ? parsed.avg_weight_lb : null,
    fixed_pick_location_id: parsed.fixed_pick_location_id || null,
    shelf_life_days: parsed.shelf_life_days || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/master-data/products");
  return { ok: true as const };
}

export async function updateProduct(id: string, raw: unknown) {
  const parsed = productSchema.parse(raw);
  const { supabase } = await requireUser();
  // 铁律 1:成交价必须物理存储 —— 主档改价只覆盖 current_price,
  // 已建 SO 行上的 unit_price 不受影响(SO 表在 Phase 4)
  // 详见 /docs/modules/04-pricing.md
  const { error } = await supabase
    .from("products")
    .update({
      ...parsed,
      avg_weight_lb: parsed.is_catch_weight ? parsed.avg_weight_lb : null,
      fixed_pick_location_id: parsed.fixed_pick_location_id || null,
      shelf_life_days: parsed.shelf_life_days || null,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/master-data/products");
  return { ok: true as const };
}

export async function createSupplier(raw: unknown) {
  const parsed = supplierSchema.parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("suppliers").insert(parsed);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/master-data/suppliers");
  return { ok: true as const };
}

export async function updateSupplier(id: string, raw: unknown) {
  const parsed = supplierSchema.parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("suppliers").update(parsed).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/master-data/suppliers");
  return { ok: true as const };
}

export async function createLocation(raw: unknown) {
  const parsed = locationSchema.parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("locations").insert(parsed);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/master-data/locations");
  return { ok: true as const };
}

export async function updateLocation(id: string, raw: unknown) {
  const parsed = locationSchema.parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("locations").update(parsed).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/master-data/locations");
  return { ok: true as const };
}

export async function createTote(raw: unknown) {
  const parsed = toteSchema.parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("totes").insert(parsed);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/master-data/totes");
  return { ok: true as const };
}

export async function updateTote(id: string, raw: unknown) {
  const parsed = toteSchema.parse(raw);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("totes").update(parsed).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/master-data/totes");
  return { ok: true as const };
}

export async function createCustomer(raw: unknown) {
  const parsed = customerSchema.parse(raw);
  const { supabase, user } = await requireUser();

  const { default_address, sales_permit_url, ...rest } = parsed;
  const permitUrl =
    sales_permit_url && sales_permit_url.length > 0 ? sales_permit_url : null;

  // 铁律 5/6:信用状态变更只允许 finance/admin —— DB 触发器 + RLS 双重强制
  // 详见 /docs/modules/10-customers-credit.md
  const { data, error } = await supabase
    .from("customers")
    .insert({
      ...rest,
      sales_permit_url: permitUrl,
      sales_permit_expiry: permitUrl ? rest.sales_permit_expiry : null,
      credit_status_by:
        rest.credit_status !== "ok" ? user.id : null,
      credit_status_at:
        rest.credit_status !== "ok" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  if (default_address && data) {
    await supabase.from("customer_addresses").insert({
      customer_id: data.id,
      label: "Default",
      address: default_address,
      is_default: true,
    });
  }

  revalidatePath("/customers");
  return { ok: true as const };
}

export async function updateCustomer(id: string, raw: unknown) {
  const parsed = customerSchema.parse(raw);
  const { supabase, user } = await requireUser();
  const { default_address, sales_permit_url, ...rest } = parsed;
  void default_address;
  const permitUrl =
    sales_permit_url && sales_permit_url.length > 0 ? sales_permit_url : null;

  const { error } = await supabase
    .from("customers")
    .update({
      ...rest,
      sales_permit_url: permitUrl,
      sales_permit_expiry: permitUrl ? rest.sales_permit_expiry : null,
      credit_status_by: user.id,
      credit_status_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true as const };
}

export async function updateSetting(key: string, value: unknown) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("settings")
    .update({ value, updated_by: user.id })
    .eq("key", key);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
