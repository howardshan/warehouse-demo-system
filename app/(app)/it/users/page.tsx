import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess, can } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { inviteUserAction } from "@/app/actions/it";
import { APP_ROLES } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  permissionLabel,
  moduleLabel,
  moduleRank,
} from "@/lib/auth/permission-labels";
import { PermissionOverrideEditor } from "./permission-override-editor";
import { ResetPasswordForm } from "./reset-password-form";
import { ProfileForm } from "./profile-form";

export default async function ItUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const access = await getSessionAccess();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const sp = await searchParams;

  if (!can(access.permissions, "it.users.manage")) {
    redirect("/dashboard");
  }

  const canManagePerms = can(access.permissions, "it.permissions.manage");
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  // emails via auth admin optional — show id if no service
  let emailMap = new Map<string, string>();
  try {
    const { createServiceClient } = await import("@/lib/supabase/admin");
    const service = createServiceClient();
    const listed = await service.auth.admin.listUsers({ perPage: 200 });
    for (const u of listed.data.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  } catch {
    emailMap = new Map();
  }

  const list = users ?? [];
  const selectedId = sp.user || list[0]?.id || "";
  const selected = list.find((u) => u.id === selectedId) ?? null;

  // id → 姓名，用于把覆盖的 updated_by 解析成可读名字
  const nameById = new Map<string, string>();
  for (const u of list) {
    nameById.set(u.id, u.full_name ?? emailMap.get(u.id) ?? u.id);
  }

  // 仅在有权限管理权时，为选中用户加载权限点/角色默认/用户覆盖
  let permissions: {
    key: string;
    module: string;
    moduleLabel: string;
    name: string;
    desc: string;
  }[] = [];
  let roleDefaultKeys: string[] = [];
  let overrideMap: Record<string, "grant" | "deny"> = {};
  let lastOverrideEdit: { by: string; at: string } | null = null;
  if (canManagePerms && selected) {
    const [{ data: perms }, { data: rolePerms }, { data: overrides }] =
      await Promise.all([
        supabase
          .from("permissions")
          .select("key, module, description")
          .order("module")
          .order("key"),
        supabase
          .from("role_permissions")
          .select("permission_key")
          .eq("role", selected.role),
        supabase
          .from("user_permissions")
          .select("permission_key, granted, updated_by, updated_at")
          .eq("user_id", selected.id),
      ]);
    permissions = (perms ?? [])
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
    roleDefaultKeys = (rolePerms ?? []).map((r) => r.permission_key);
    overrideMap = Object.fromEntries(
      (overrides ?? []).map((o) => [
        o.permission_key,
        o.granted ? "grant" : "deny",
      ]),
    ) as Record<string, "grant" | "deny">;
    // 覆盖由 setUserPermissionOverrides 整体重写，所有行同一 updated_at/by
    const latest = (overrides ?? [])
      .filter((o) => o.updated_at)
      .sort((a, b) => (a.updated_at! < b.updated_at! ? 1 : -1))[0];
    if (latest) {
      lastOverrideEdit = {
        by: latest.updated_by
          ? nameById.get(latest.updated_by) ?? latest.updated_by
          : "—",
        at: new Date(latest.updated_at as string).toLocaleString(),
      };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "it.usersTitle")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "it.usersHint")}{" "}
          <Link
            href="/it/role-permissions"
            className="text-teal-800 hover:underline"
          >
            {t(messages, "nav.rolePermissions")}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Invite / create user</h2>
        </CardHeader>
        <CardBody>
          <form
            action={inviteUserAction}
            className="grid gap-3 md:grid-cols-2 lg:grid-cols-5"
          >
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            <div>
              <Label>Password</Label>
              <Input name="password" type="password" minLength={8} required />
            </div>
            <div>
              <Label>Name</Label>
              <Input name="full_name" />
            </div>
            <div>
              <Label>{t(messages, "it.role")}</Label>
              <Select name="role" defaultValue="sales">
                {APP_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(messages, "roles." + r)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit">{t(messages, "common.save")}</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* 左：用户列表 */}
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-400">
            {t(messages, "it.selectUser")}
          </div>
          {list.map((u) => {
            const isSel = u.id === selectedId;
            return (
              <Link
                key={u.id}
                href={`/it/users?user=${u.id}`}
                scroll={false}
                className={`block rounded-lg border px-3 py-2 transition ${
                  isSel
                    ? "border-teal-700 bg-teal-50"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {u.full_name ?? "—"}
                  </span>
                  <Badge tone={u.is_active ? "ok" : "neutral"}>
                    {u.is_active ? "active" : "off"}
                  </Badge>
                </div>
                <div className="truncate font-mono text-xs text-stone-400">
                  {emailMap.get(u.id) ?? u.id}
                </div>
                <div className="mt-1 text-xs text-teal-800">
                  {t(messages, "roles." + u.role, u.role)}
                </div>
              </Link>
            );
          })}
        </div>

        {/* 右：选中用户详情 */}
        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader>
                  <h2 className="font-semibold">
                    {selected.full_name ?? emailMap.get(selected.id) ?? selected.id}
                  </h2>
                  <p className="font-mono text-xs text-stone-400">
                    {emailMap.get(selected.id) ?? selected.id}
                  </p>
                </CardHeader>
                <CardBody>
                  <ProfileForm
                    key={`profile-${selected.id}-${selected.role}-${selected.is_active}-${selected.full_name ?? ""}`}
                    user={{
                      id: selected.id,
                      full_name: selected.full_name,
                      role: selected.role,
                      is_active: selected.is_active,
                    }}
                    labels={{
                      role: t(messages, "it.role"),
                      active: t(messages, "it.active"),
                      save: t(messages, "it.save"),
                      saved: t(messages, "it.saved"),
                    }}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold">
                    {t(messages, "it.resetPassword")}
                  </h2>
                </CardHeader>
                <CardBody>
                  <ResetPasswordForm
                    key={selected.id}
                    userId={selected.id}
                    labels={{
                      newPassword: t(messages, "it.newPassword"),
                      reset: t(messages, "it.resetPassword"),
                      done: t(messages, "it.resetPasswordDone"),
                    }}
                  />
                </CardBody>
              </Card>

              {canManagePerms && (
                <div className="space-y-2">
                  <div>
                    <h2 className="font-semibold">
                      {t(messages, "it.permOverrideTitle")}
                    </h2>
                    <p className="text-sm text-stone-500">
                      {t(messages, "it.permissionsHint")}
                    </p>
                    {lastOverrideEdit && (
                      <p className="mt-1 text-xs text-stone-400">
                        {t(messages, "it.lastOverrideEdit")}:{" "}
                        {lastOverrideEdit.by} · {lastOverrideEdit.at}
                      </p>
                    )}
                  </div>
                  <PermissionOverrideEditor
                    key={selected.id}
                    selectedUserId={selected.id}
                    permissions={permissions}
                    roleDefaultKeys={roleDefaultKeys}
                    overrides={overrideMap}
                  />
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-stone-500">
                  {t(messages, "it.selectUser")}
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
