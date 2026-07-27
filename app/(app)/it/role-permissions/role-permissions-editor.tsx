"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRolePermissions } from "@/app/actions/it";
import { APP_ROLE_LABELS, type AppRole } from "@/lib/auth/roles";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Perm = { key: string; module: string; description: string };

export function RolePermissionsEditor({
  roles,
  selectedRole,
  permissions,
  grantedKeys,
}: {
  roles: AppRole[];
  selectedRole: AppRole;
  permissions: Perm[];
  grantedKeys: string[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const p of permissions) {
      map[p.key] = grantedKeys.includes(p.key);
    }
    return map;
  });

  const byModule = useMemo(() => {
    const m = new Map<string, Perm[]>();
    for (const p of permissions) {
      const list = m.get(p.module) ?? [];
      list.push(p);
      m.set(p.module, list);
    }
    return [...m.entries()];
  }, [permissions]);

  const selectedCount = Object.values(checked).filter(Boolean).length;
  const isAdmin = selectedRole === "admin";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="max-w-xs">
          <label className="mb-1 block text-sm font-medium text-stone-700">
            {t("pg.it.selectRole")}
          </label>
          <Select
            value={selectedRole}
            onChange={(e) =>
              router.push(`/it/role-permissions?role=${e.target.value}`)
            }
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {APP_ROLE_LABELS[r]} ({r})
              </option>
            ))}
          </Select>
        </div>
        <p className="pb-2 text-sm text-stone-500">
          {t("pg.it.selectedCount")
            .replace("{n}", String(selectedCount))
            .replace("{total}", String(permissions.length))}
          {isAdmin && t("pg.it.adminAlwaysAll")}
        </p>
      </div>

      {byModule.map(([module, perms]) => (
        <Card key={module}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <h2 className="font-semibold uppercase tracking-wide text-teal-900">
              {module}
            </h2>
            {!isAdmin && (
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-teal-800 hover:underline"
                  onClick={() =>
                    setChecked((prev) => {
                      const next = { ...prev };
                      for (const p of perms) next[p.key] = true;
                      return next;
                    })
                  }
                >
                  {t("pg.it.selectAllModule")}
                </button>
                <button
                  type="button"
                  className="text-stone-500 hover:underline"
                  onClick={() =>
                    setChecked((prev) => {
                      const next = { ...prev };
                      for (const p of perms) next[p.key] = false;
                      return next;
                    })
                  }
                >
                  {t("pg.it.clear")}
                </button>
              </div>
            )}
          </CardHeader>
          <CardBody className="space-y-1">
            {perms.map((p) => (
              <label
                key={p.key}
                className="flex cursor-pointer items-start gap-3 border-b border-stone-50 py-2 last:border-0"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!checked[p.key]}
                  disabled={isAdmin}
                  onChange={(e) =>
                    setChecked((prev) => ({
                      ...prev,
                      [p.key]: e.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="font-mono text-xs text-teal-900">
                    {p.key}
                  </span>
                  <span className="mt-0.5 block text-sm text-stone-600">
                    {p.description}
                  </span>
                </span>
              </label>
            ))}
          </CardBody>
        </Card>
      ))}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <Button
        disabled={pending || isAdmin}
        onClick={() => {
          setError(null);
          start(async () => {
            const keys = Object.entries(checked)
              .filter(([, on]) => on)
              .map(([k]) => k);
            const res = await setRolePermissions(selectedRole, keys);
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {pending
          ? t("pg.it.saving")
          : isAdmin
            ? t("pg.it.adminNotEditable")
            : t("pg.it.saveRolePermissions")}
      </Button>
    </div>
  );
}
