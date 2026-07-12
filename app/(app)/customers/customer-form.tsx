"use client";

import { useState, useTransition } from "react";
import { createCustomer } from "@/app/actions/master-data";
import { CREDIT_STATUSES } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function CustomerCreateForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">新建客户</h2>
        <p className="text-sm text-stone-500">
          信用状态变更在数据库层仅 finance/admin 可写（铁律 5/6）。Sales Permit
          必须有有效期。
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              const res = await createCustomer({
                code: String(fd.get("code")),
                name: String(fd.get("name")),
                legal_name: String(fd.get("legal_name") || "") || null,
                tax_id: String(fd.get("tax_id") || "") || null,
                credit_limit: Number(fd.get("credit_limit")),
                payment_terms_days: Number(fd.get("payment_terms_days")),
                overdue_block_days: Number(fd.get("overdue_block_days") || 60),
                credit_status: String(fd.get("credit_status")),
                credit_status_note:
                  String(fd.get("credit_status_note") || "") || null,
                sales_permit_url:
                  String(fd.get("sales_permit_url") || "") || null,
                sales_permit_expiry:
                  String(fd.get("sales_permit_expiry") || "") || null,
                delivery_route:
                  String(fd.get("delivery_route") || "") || null,
                default_address:
                  String(fd.get("default_address") || "") || null,
                is_active: true,
              });
              if (!res.ok) setError(res.error);
              else e.currentTarget.reset();
            });
          }}
        >
          <div>
            <Label>客户编码</Label>
            <Input name="code" required />
          </div>
          <div>
            <Label>餐馆名</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>法定名称</Label>
            <Input name="legal_name" />
          </div>
          <div>
            <Label>Tax ID</Label>
            <Input name="tax_id" />
          </div>
          <div>
            <Label>信用额度</Label>
            <Input
              name="credit_limit"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              required
            />
          </div>
          <div>
            <Label>账期(天, 0=COD)</Label>
            <Input
              name="payment_terms_days"
              type="number"
              min="0"
              defaultValue={0}
              required
            />
          </div>
          <div>
            <Label>逾期停供天数</Label>
            <Input
              name="overdue_block_days"
              type="number"
              min="0"
              defaultValue={60}
            />
          </div>
          <div>
            <Label>信用状态</Label>
            <Select name="credit_status" defaultValue="ok">
              {CREDIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>信用备注</Label>
            <Input name="credit_status_note" />
          </div>
          <div>
            <Label>Sales Permit URL</Label>
            <Input name="sales_permit_url" type="url" placeholder="https://..." />
          </div>
          <div>
            <Label>Sales Permit 有效期</Label>
            <Input name="sales_permit_expiry" type="date" />
          </div>
          <div>
            <Label>配送线路</Label>
            <Input name="delivery_route" />
          </div>
          <div>
            <Label>默认送货地址</Label>
            <Input name="default_address" />
          </div>
          {error && (
            <p className="md:col-span-2 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "保存中…" : "创建客户"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
