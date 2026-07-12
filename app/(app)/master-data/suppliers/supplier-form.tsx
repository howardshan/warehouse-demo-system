"use client";

import { useState, useTransition } from "react";
import { createSupplier } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function SupplierCreateForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">新建供应商</h2>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              const res = await createSupplier({
                name: String(fd.get("name")),
                contact: String(fd.get("contact") || "") || null,
                phone: String(fd.get("phone") || "") || null,
                is_active: true,
              });
              if (!res.ok) setError(res.error);
              else e.currentTarget.reset();
            });
          }}
        >
          <div>
            <Label>名称</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>联系人</Label>
            <Input name="contact" />
          </div>
          <div>
            <Label>电话</Label>
            <Input name="phone" />
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
