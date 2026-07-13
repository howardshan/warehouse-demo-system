import { createClient } from "@/lib/supabase/server";

export async function getSessionAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null as string | null, permissions: [] as string[] };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    return { user, role: profile?.role ?? null, permissions: [] as string[] };
  }

  // admin shortcut
  if (profile.role === "admin") {
    const { data: all } = await supabase.from("permissions").select("key");
    return {
      user,
      role: profile.role,
      permissions: (all ?? []).map((p) => p.key),
    };
  }

  const { data: permRows, error } = await supabase.rpc(
    "current_user_permissions",
  );
  if (error || permRows == null) {
    // fallback: role_permissions
    const { data: rolePerms } = await supabase
      .from("role_permissions")
      .select("permission_key")
      .eq("role", profile.role);
    const { data: overrides } = await supabase
      .from("user_permissions")
      .select("permission_key, granted")
      .eq("user_id", user.id);

    const set = new Set((rolePerms ?? []).map((r) => r.permission_key));
    for (const o of overrides ?? []) {
      if (o.granted) set.add(o.permission_key);
      else set.delete(o.permission_key);
    }
    return { user, role: profile.role, permissions: [...set] };
  }

  return {
    user,
    role: profile.role,
    permissions: permRows as string[],
  };
}

export function can(permissions: string[], key: string): boolean {
  return permissions.includes(key);
}

export function canAny(permissions: string[], keys: string[]): boolean {
  return keys.some((k) => permissions.includes(k));
}
