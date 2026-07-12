"use client";

import { useState, useTransition } from "react";
import { createLocation } from "@/app/actions/master-data";
import { LOCATION_TYPES, TEMP_ZONES } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function LocationCreateForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">新建储位</h2>
        <p className="text-sm text-stone-500">
          pick_face = 固定拣货位（一 SKU 一位，同时只能一批号 — 铁律 7）
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              const res = await createLocation({
                code: String(fd.get("code")),
                type: String(fd.get("type")),
                temp_zone: String(fd.get("temp_zone")),
                is_active: true,
              });
              if (!res.ok) setError(res.error);
              else e.currentTarget.reset();
            });
          }}
        >
          <div>
            <Label>编码</Label>
            <Input name="code" placeholder="PF-A01" required />
          </div>
          <div>
            <Label>类型</Label>
            <Select name="type" defaultValue="pick_face">
              {LOCATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>温区</Label>
            <Select name="temp_zone" defaultValue="chilled">
              {TEMP_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </div>
          {error && (
            <p className="md:col-span-3 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "保存中…" : "创建"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
