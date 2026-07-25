"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserPermissionOverrides } from "@/app/actions/it";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Perm = {
  key: string;
  module: string;
  moduleLabel: string;
  name: string;
  desc: string;
};
type State = "default" | "grant" | "deny";

/**
 * 单个用户的功能权限覆盖编辑器（在用户管理页详情面板中使用）。
 * 展示每个权限点：角色默认是否含（✓/—）+ 用户级覆盖（默认/授予/收回）。
 */
export function PermissionOverrideEditor({
  selectedUserId,
  permissions,
  roleDefaultKeys,
  overrides,
  labels,
}: {
  selectedUserId: string;
  permissions: Perm[];
  roleDefaultKeys: string[];
  overrides: Record<string, "grant" | "deny">;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [states, setStates] = useState<Record<string, State>>(() => {
    const map: Record<string, State> = {};
    for (const p of permissions) map[p.key] = overrides[p.key] ?? "default";
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

  return (
    <div className="space-y-3">
      {byModule.map(([module, perms]) => (
        <Card key={module}>
          <CardHeader>
            <h3 className="text-sm font-semibold tracking-wide text-teal-900">
              {perms[0]?.moduleLabel ?? module}
            </h3>
          </CardHeader>
          <CardBody className="space-y-1">
            {perms.map((p) => {
              const isDefault = roleDefaultKeys.includes(p.key);
              return (
                <div
                  key={p.key}
                  className="grid gap-2 border-b border-stone-50 py-2 md:grid-cols-[1fr_180px] md:items-center"
                >
                  <div>
                    <div className="text-sm font-medium text-stone-800">
                      {p.name}
                    </div>
                    {p.desc && (
                      <div className="text-xs text-stone-500">{p.desc}</div>
                    )}
                    <div className="mt-0.5 font-mono text-[11px] text-stone-400">
                      {p.key} · {labels.default}: {isDefault ? "✓" : "—"}
                    </div>
                  </div>
                  <Select
                    value={states[p.key] ?? "default"}
                    onChange={(e) =>
                      setStates((s) => ({
                        ...s,
                        [p.key]: e.target.value as State,
                      }))
                    }
                  >
                    <option value="default">
                      {labels.default}
                      {isDefault ? " (✓)" : " (—)"}
                    </option>
                    <option value="grant">{labels.granted}</option>
                    <option value="deny">{labels.denied}</option>
                  </Select>
                </div>
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
              const entries = Object.entries(states).map(([key, state]) => ({
                key,
                state,
              }));
              const res = await setUserPermissionOverrides(
                selectedUserId,
                entries,
              );
              if (!res.ok) notify(res.error, "error");
              else {
                notify(labels.saved ?? "✓", "success");
                router.refresh();
              }
            });
          }}
        >
          {pending ? "…" : labels.save}
        </Button>
      </div>
    </div>
  );
}
