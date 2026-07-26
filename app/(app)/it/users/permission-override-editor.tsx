"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserPermissionOverrides } from "@/app/actions/it";
import { useI18n } from "@/components/i18n/provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Perm = {
  key: string;
  module: string;
  moduleLabel: string;
  name: string;
  desc: string;
};

/**
 * 单个用户的功能权限覆盖编辑器（用户管理页详情面板）。
 * 勾选框 = 该用户最终是否可用此功能（生效态）。
 * 与角色默认不同的项，保存时自动转成用户级覆盖（grant/deny）；
 * 与角色默认相同的项不写覆盖（继承角色）。后端 action 不变。
 */
export function PermissionOverrideEditor({
  selectedUserId,
  permissions,
  roleDefaultKeys,
  overrides,
}: {
  selectedUserId: string;
  permissions: Perm[];
  roleDefaultKeys: string[];
  overrides: Record<string, "grant" | "deny">;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { notify } = useToast();
  const [pending, start] = useTransition();

  const roleDefault = useMemo(
    () => new Set(roleDefaultKeys),
    [roleDefaultKeys],
  );

  // 初始勾选态 = 生效态：覆盖优先，否则取角色默认
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const p of permissions) {
      const ov = overrides[p.key];
      map[p.key] = ov ? ov === "grant" : roleDefault.has(p.key);
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

  const overrideCount = permissions.filter(
    (p) => !!checked[p.key] !== roleDefault.has(p.key),
  ).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-400">{t("it.overrideHint")}</p>

      {byModule.map(([module, perms]) => (
        <Card key={module}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-wide text-teal-900">
              {perms[0]?.moduleLabel ?? module}
            </h3>
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
                {t("it.selectAllModule")}
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
                {t("it.clear")}
              </button>
            </div>
          </CardHeader>
          <CardBody className="space-y-1">
            {perms.map((p) => {
              const isDefault = roleDefault.has(p.key);
              const isOverride = !!checked[p.key] !== isDefault;
              return (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-start gap-3 border-b border-stone-50 py-2 last:border-0"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!checked[p.key]}
                    onChange={(e) =>
                      setChecked((prev) => ({
                        ...prev,
                        [p.key]: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-800">
                        {p.name}
                      </span>
                      {isOverride && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          {t("it.override")}
                        </span>
                      )}
                    </span>
                    {p.desc && (
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {p.desc}
                      </span>
                    )}
                    <span className="mt-0.5 block font-mono text-[11px] text-stone-400">
                      {p.key} · {t("it.default")}: {isDefault ? "✓" : "—"}
                    </span>
                  </span>
                </label>
              );
            })}
          </CardBody>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <Button
          disabled={pending || !selectedUserId}
          onClick={() => {
            start(async () => {
              // 生效态与角色默认比较，推导覆盖：相同=default，不同=grant/deny
              const entries = permissions.map((p) => {
                const on = !!checked[p.key];
                const isDefault = roleDefault.has(p.key);
                const state: "default" | "grant" | "deny" =
                  on === isDefault ? "default" : on ? "grant" : "deny";
                return { key: p.key, state };
              });
              const res = await setUserPermissionOverrides(
                selectedUserId,
                entries,
              );
              if (!res.ok) notify(res.error, "error");
              else {
                notify(t("it.saved"), "success");
                router.refresh();
              }
            });
          }}
        >
          {pending ? t("it.saving") : t("it.save")}
        </Button>
        {overrideCount > 0 && (
          <span className="text-xs text-stone-500">
            {overrideCount} {t("it.override")}
          </span>
        )}
      </div>
    </div>
  );
}
