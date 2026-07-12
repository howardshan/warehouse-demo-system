"use client";

import { useState, useTransition } from "react";
import { createTote } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function ToteCreateForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">新建周转筐</h2>
        <p className="text-sm text-stone-500">
          两步拣货的载体：取货绑定筐号，称重扫筐复核（ADR-0003）。
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="flex max-w-md items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              const res = await createTote({
                code: String(fd.get("code")),
                is_active: true,
              });
              if (!res.ok) setError(res.error);
              else e.currentTarget.reset();
            });
          }}
        >
          <div className="flex-1">
            <Label>筐号</Label>
            <Input name="code" placeholder="A17" required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "创建"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </CardBody>
    </Card>
  );
}
