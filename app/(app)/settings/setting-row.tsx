"use client";

import { useState, useTransition } from "react";
import { updateSetting } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingRow({
  settingKey,
  value,
  description,
}: {
  settingKey: string;
  value: unknown;
  description: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const display =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : JSON.stringify(value);

  return (
    <form
      className="grid gap-3 border-b border-stone-100 py-4 md:grid-cols-[220px_1fr_auto] md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const raw = String(new FormData(e.currentTarget).get("value"));
        let parsed: unknown = raw;
        if (raw === "true" || raw === "false") parsed = raw === "true";
        else if (!Number.isNaN(Number(raw)) && raw.trim() !== "")
          parsed = Number(raw);
        setError(null);
        start(async () => {
          const res = await updateSetting(settingKey, parsed);
          if (!res.ok) setError(res.error);
        });
      }}
    >
      <div>
        <div className="font-mono text-xs text-teal-900">{settingKey}</div>
        <p className="mt-1 text-xs text-stone-500">{description}</p>
      </div>
      <div>
        <Label className="sr-only">值</Label>
        <Input name="value" defaultValue={display} />
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "保存"}
      </Button>
    </form>
  );
}
