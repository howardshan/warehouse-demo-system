"use client";

import { useState, useTransition } from "react";
import { createRoute } from "@/app/actions/master-data";
import { WEEKDAYS } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const WEEKDAY_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function RouteCreateForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">新建路线</h2>
        <p className="text-sm text-stone-500">
          路线 = 配送日（周几）+ 默认车辆 + 可选截单时刻。客户绑定路线后按站序装车。
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const form = e.currentTarget;
            setError(null);
            start(async () => {
              const res = await createRoute({
                code: String(fd.get("code")),
                name: String(fd.get("name")),
                delivery_weekday: Number(fd.get("delivery_weekday")),
                default_vehicle: String(fd.get("default_vehicle") || "") || null,
                cutoff_time: String(fd.get("cutoff_time") || "") || null,
                is_active: true,
              });
              if (!res.ok) setError(res.error);
              else form.reset();
            });
          }}
        >
          <div>
            <Label>路线编码</Label>
            <Input name="code" placeholder="RTE-A" required />
          </div>
          <div>
            <Label>路线名称</Label>
            <Input name="name" placeholder="周二 · Frisco 线" required />
          </div>
          <div>
            <Label>配送日</Label>
            <Select name="delivery_weekday" defaultValue="2">
              {WEEKDAYS.map((w) => (
                <option key={w} value={w}>
                  {WEEKDAY_ZH[w]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>默认车辆</Label>
            <Input name="default_vehicle" placeholder="TRUCK-02" />
          </div>
          <div>
            <Label>截单时刻（可选）</Label>
            <Input name="cutoff_time" type="time" />
          </div>
          {error && (
            <p className="md:col-span-3 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "保存中…" : "创建路线"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
