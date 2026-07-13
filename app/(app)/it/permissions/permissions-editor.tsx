"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserPermissionOverrides } from "@/app/actions/it";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Perm = { key: string; module: string; description: string };
type State = "default" | "grant" | "deny";

function EditorInner({
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
    <>
      {byModule.map(([module, perms]) => (
        <Card key={module}>
          <CardHeader>
            <h2 className="font-semibold uppercase tracking-wide text-teal-900">
              {labels.module}: {module}
            </h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {perms.map((p) => (
              <div
                key={p.key}
                className="grid gap-2 border-b border-stone-50 py-2 md:grid-cols-[1fr_220px] md:items-center"
              >
                <div>
                  <div className="font-mono text-xs text-teal-900">{p.key}</div>
                  <div className="text-sm text-stone-600">{p.description}</div>
                  <div className="text-xs text-stone-400">
                    {labels.default}: {roleDefaultKeys.includes(p.key) ? "✓" : "—"}
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
                  <option value="default">{labels.default}</option>
                  <option value="grant">{labels.granted}</option>
                  <option value="deny">{labels.denied}</option>
                </Select>
              </div>
            ))}
          </CardBody>
        </Card>
      ))}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button
        disabled={pending || !selectedUserId}
        onClick={() => {
          setError(null);
          start(async () => {
            const entries = Object.entries(states).map(([key, state]) => ({
              key,
              state,
            }));
            const res = await setUserPermissionOverrides(selectedUserId, entries);
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "…" : labels.save}
      </Button>
    </>
  );
}

export function PermissionsEditor(props: {
  users: { id: string; label: string }[];
  selectedUserId: string;
  permissions: Perm[];
  roleDefaultKeys: string[];
  overrides: Record<string, "grant" | "deny">;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <label className="mb-1 block text-sm font-medium text-stone-700">
          {props.labels.selectUser}
        </label>
        <Select
          value={props.selectedUserId}
          onChange={(e) => router.push(`/it/permissions?user=${e.target.value}`)}
        >
          {props.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </Select>
      </div>
      <EditorInner key={props.selectedUserId} {...props} />
    </div>
  );
}
