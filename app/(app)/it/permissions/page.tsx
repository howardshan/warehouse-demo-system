import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess, can } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { PermissionsEditor } from "./permissions-editor";

export default async function ItPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const access = await getSessionAccess();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const sp = await searchParams;

  if (!can(access.permissions, "it.permissions.manage")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [{ data: users }, { data: permissions }, { data: rolePerms }] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, full_name, role, is_active")
        .order("full_name"),
      supabase.from("permissions").select("key, module, description").order("module").order("key"),
      supabase.from("role_permissions").select("role, permission_key"),
    ]);

  const selectedId = sp.user || users?.[0]?.id || "";
  const selected = (users ?? []).find((u) => u.id === selectedId) ?? null;

  const { data: overrides } = selected
    ? await supabase
        .from("user_permissions")
        .select("permission_key, granted")
        .eq("user_id", selected.id)
    : { data: [] };

  const roleDefault = new Set(
    (rolePerms ?? [])
      .filter((r) => r.role === selected?.role)
      .map((r) => r.permission_key),
  );

  const overrideMap = Object.fromEntries(
    (overrides ?? []).map((o) => [o.permission_key, o.granted ? "grant" : "deny"]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "it.permissionsTitle")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "it.permissionsHint")}{" "}
          <Link
            href="/it/role-permissions"
            className="text-teal-800 hover:underline"
          >
            {t(messages, "nav.rolePermissions")}
          </Link>
        </p>
      </div>

      <PermissionsEditor
        users={(users ?? []).map((u) => ({
          id: u.id,
          label: `${u.full_name ?? u.id} (${u.role})`,
        }))}
        selectedUserId={selectedId}
        permissions={permissions ?? []}
        roleDefaultKeys={[...roleDefault]}
        overrides={overrideMap as Record<string, "grant" | "deny">}
        labels={{
          selectUser: t(messages, "it.selectUser"),
          module: t(messages, "it.module"),
          permission: t(messages, "it.permission"),
          granted: t(messages, "it.granted"),
          denied: t(messages, "it.denied"),
          default: t(messages, "it.default"),
          save: t(messages, "it.save"),
        }}
      />
    </div>
  );
}
