"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSessionAccess, can } from "@/lib/auth/access";
import { isAppRole } from "@/lib/auth/roles";

async function requireItUsers() {
  const access = await getSessionAccess();
  if (!access.user || !can(access.permissions, "it.users.manage")) {
    throw new Error("需要 IT 权限");
  }
  return access;
}

async function requireItPermissions() {
  const access = await getSessionAccess();
  if (!access.user || !can(access.permissions, "it.permissions.manage")) {
    return null;
  }
  return access;
}

export async function updateUserProfile(formData: FormData) {
  const access = await requireItUsers();
  const userId = String(formData.get("user_id") || "");
  const role = String(formData.get("role") || "");
  const isActive = String(formData.get("is_active") || "") === "on";
  const fullName = String(formData.get("full_name") || "");

  if (!userId || !isAppRole(role)) {
    return { ok: false as const, error: "参数无效" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({
      role,
      is_active: isActive,
      full_name: fullName || null,
    })
    .eq("id", userId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/it/users");
  revalidatePath("/it/permissions");
  void access;
  return { ok: true as const };
}

export async function inviteUser(formData: FormData) {
  await requireItUsers();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "sales");
  const fullName = String(formData.get("full_name") || "");

  if (!email || password.length < 8) {
    return { ok: false as const, error: "邮箱与密码（至少 8 位）必填" };
  }
  if (!isAppRole(role)) {
    return { ok: false as const, error: "角色无效" };
  }

  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) return { ok: false as const, error: error.message };

  if (data.user) {
    await service.from("user_profiles").upsert({
      id: data.user.id,
      full_name: fullName || email,
      role,
      is_active: true,
    });
  }

  revalidatePath("/it/users");
  return { ok: true as const };
}

export async function setUserPermissionOverrides(
  userId: string,
  entries: { key: string; state: "default" | "grant" | "deny" }[],
) {
  const access = await requireItPermissions();
  if (!access?.user) {
    return { ok: false as const, error: "需要 IT 权限" };
  }

  const supabase = await createClient();
  await supabase.from("user_permissions").delete().eq("user_id", userId);

  const rows = entries
    .filter((e) => e.state !== "default")
    .map((e) => ({
      user_id: userId,
      permission_key: e.key,
      granted: e.state === "grant",
      updated_by: access.user!.id,
    }));

  if (rows.length) {
    const { error } = await supabase.from("user_permissions").insert(rows);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/it/permissions");
  return { ok: true as const };
}

/** 覆盖某角色的全部功能权限（勾选即授予） */
export async function setRolePermissions(
  role: string,
  permissionKeys: string[],
) {
  const access = await requireItPermissions();
  if (!access?.user) {
    return { ok: false as const, error: "需要 IT 权限" };
  }
  if (!isAppRole(role)) {
    return { ok: false as const, error: "角色无效" };
  }

  const supabase = await createClient();
  const { data: allPerms, error: permErr } = await supabase
    .from("permissions")
    .select("key");
  if (permErr) return { ok: false as const, error: permErr.message };

  const valid = new Set((allPerms ?? []).map((p) => p.key));
  const keys = [...new Set(permissionKeys)].filter((k) => valid.has(k));

  // admin 保存时强制全量（运行时 admin 本就全开）
  const finalKeys = role === "admin" ? [...valid] : keys;

  const { error: delErr } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role", role);
  if (delErr) return { ok: false as const, error: delErr.message };

  if (finalKeys.length) {
    const { error: insErr } = await supabase.from("role_permissions").insert(
      finalKeys.map((permission_key) => ({
        role,
        permission_key,
      })),
    );
    if (insErr) return { ok: false as const, error: insErr.message };
  }

  revalidatePath("/it/role-permissions");
  revalidatePath("/it/permissions");
  return { ok: true as const, count: finalKeys.length };
}

export async function inviteUserAction(formData: FormData): Promise<void> {
  await inviteUser(formData);
}

export async function updateUserProfileAction(
  formData: FormData,
): Promise<void> {
  await updateUserProfile(formData);
}
