"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserPermissionOverrides } from "@/app/actions/it";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Perm = { key: string; module: string; description: string };
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
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
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
            <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-900">
              {labels.module}: {module}
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
                    <div className="font-mono text-xs text-teal-900">{p.key}</div>
                    <div className="text-sm text-stone-600">{p.description}</div>
                    <div className="text-xs text-stone-400">
                      {labels.default}: {isDefault ? "✓" : "—"}
                    </div>
                  </div>
                  <Select
                    value={states[p.key] ?? "default"}
                    onChange={(e) => {
                      setSaved(false);
                      setStates((s) => ({
                        ...s,
                        [p.key]: e.target.value as State,
                      }));
                    }}
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
            setError(null);
            setSaved(false);
            start(async () => {
              const entries = Object.entries(states).map(([key, state]) => ({
                key,
                state,
              }));
              const res = await setUserPermissionOverrides(
                selectedUserId,
                entries,
              );
              if (!res.ok) setError(res.error);
              else {
                setSaved(true);
                router.refresh();
              }
            });
          }}
        >
          {pending ? "…" : labels.save}
        </Button>
        {error && <span className="text-sm text-red-700">{error}</span>}
        {saved && !error && (
          <span className="text-sm text-teal-700">{labels.saved ?? "✓"}</span>
        )}
      </div>
    </div>
  );
}
