import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess, can } from "@/lib/auth/access";
import { APP_ROLES, APP_ROLE_LABELS, isAppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const [{ data: permissions }, { data: rolePerms }] = await Promise.all([
    supabase
      .from("permissions")
      .select("key, module, description")
      .order("module")
      .order("key"),
    supabase
      .from("role_permissions")
      .select("permission_key")
      .eq("role", selectedRole),
  ]);

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
          href="/it/permissions"
          className="text-sm text-teal-800 hover:underline"
        >
          ← 用户功能权限覆盖
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">角色权限</h1>
        <p className="mt-1 text-sm text-stone-500">
          为用户管理中可选的每个角色配置默认功能权限。用户级覆盖请在「功能权限」页设置。
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">代码</th>
              <th className="px-4 py-3">默认权限数</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {APP_ROLES.map((role) => (
              <tr key={role} className="border-t border-stone-100">
                <td className="px-4 py-3 font-medium">
                  {APP_ROLE_LABELS[role]}
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
                    编辑
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
        permissions={permissions ?? []}
        grantedKeys={grantedKeys}
      />
    </div>
  );
}
