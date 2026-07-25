import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess, can } from "@/lib/auth/access";
import { APP_ROLES, isAppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import {
  permissionLabel,
  moduleLabel,
  moduleRank,
} from "@/lib/auth/permission-labels";
import { RolePermissionsEditor } from "./role-permissions-editor";

export default async function RolePermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const access = await getSessionAccess();
  if (!can(access.permissions, "it.permissions.manage")) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const rawRole = sp.role ?? "";
  const selectedRole = isAppRole(rawRole) ? rawRole : "purchasing";
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  const supabase = await createClient();
  const [{ data: permissions }, { data: rolePerms }] = await Promise.all([
    supabase
      .from("permissions")
      .select("key, module")
      .order("module")
      .order("key"),
    supabase
      .from("role_permissions")
      .select("permission_key")
      .eq("role", selectedRole),
  ]);

  const enrichedPermissions = (permissions ?? [])
    .map((p) => {
      const l = permissionLabel(p.key, locale);
      return {
        key: p.key,
        module: p.module,
        moduleLabel: moduleLabel(p.module, locale),
        name: l.name,
        desc: l.desc,
      };
    })
    .sort(
      (a, b) =>
        moduleRank(a.module) - moduleRank(b.module) ||
        a.key.localeCompare(b.key),
    );

  const grantedKeys = (rolePerms ?? []).map((r) => r.permission_key);

  // 各角色权限数量一览
  const { data: allRolePerms } = await supabase
    .from("role_permissions")
    .select("role, permission_key");
  const counts = new Map<string, number>();
  for (const row of allRolePerms ?? []) {
    counts.set(row.role, (counts.get(row.role) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/it/users"
          className="text-sm text-teal-800 hover:underline"
        >
          ← {t(messages, "it.backToUsers")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {t(messages, "it.rolePermsTitle")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "it.rolePermsHint")}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">{t(messages, "it.role")}</th>
              <th className="px-4 py-3">{t(messages, "it.roleCode")}</th>
              <th className="px-4 py-3">{t(messages, "it.defaultPermCount")}</th>
              <th className="px-4 py-3">{t(messages, "it.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {APP_ROLES.map((role) => (
              <tr key={role} className="border-t border-stone-100">
                <td className="px-4 py-3 font-medium">
                  {t(messages, "roles." + role)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{role}</td>
                <td className="px-4 py-3 tabular-nums">
                  {counts.get(role) ?? 0}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/it/role-permissions?role=${role}`}
                    className="text-sm font-medium text-teal-800 hover:underline"
                  >
                    {t(messages, "it.edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RolePermissionsEditor
        key={selectedRole}
        roles={[...APP_ROLES]}
        selectedRole={selectedRole}
        permissions={enrichedPermissions}
        grantedKeys={grantedKeys}
      />
    </div>
  );
}
