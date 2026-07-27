"use client";

import { useState, useTransition } from "react";
import { createCustomer } from "@/app/actions/master-data";
import { CREDIT_STATUSES } from "@/lib/domain/schemas";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

<<<<<<< HEAD
export function CustomerCreateForm() {
  const { t } = useI18n();
=======
export function CustomerCreateForm({
  routes,
}: {
  routes: { id: string; code: string; name: string }[];
}) {
>>>>>>> 81fe284f9fcafb093982c6de6b8a33316a2e38cc
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">{t("pg.customers.newCustomer")}</h2>
        <p className="text-sm text-stone-500">
          {t("pg.customers.newCustomerHint")}
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
                route_id: String(fd.get("route_id") || "") || null,
                route_stop_seq:
                  String(fd.get("route_stop_seq") || "") || null,
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
            <Label>{t("pg.customers.customerCode")}</Label>
            <Input name="code" required />
          </div>
          <div>
            <Label>{t("pg.customers.restaurantName")}</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>{t("pg.customers.legalName")}</Label>
            <Input name="legal_name" />
          </div>
          <div>
            <Label>Tax ID</Label>
            <Input name="tax_id" />
          </div>
          <div>
            <Label>{t("pg.customers.creditLimitFull")}</Label>
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
            <Label>{t("pg.customers.paymentTermsDays")}</Label>
            <Input
              name="payment_terms_days"
              type="number"
              min="0"
              defaultValue={0}
              required
            />
          </div>
          <div>
            <Label>{t("pg.customers.overdueBlockDaysLabel")}</Label>
            <Input
              name="overdue_block_days"
              type="number"
              min="0"
              defaultValue={60}
            />
          </div>
          <div>
            <Label>{t("pg.customers.creditStatus")}</Label>
            <Select name="credit_status" defaultValue="ok">
              {CREDIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>{t("pg.customers.creditNote")}</Label>
            <Input name="credit_status_note" />
          </div>
          <div>
            <Label>Sales Permit URL</Label>
            <Input name="sales_permit_url" type="url" placeholder="https://..." />
          </div>
          <div>
            <Label>{t("pg.customers.salesPermitExpiry")}</Label>
            <Input name="sales_permit_expiry" type="date" />
          </div>
          <div>
<<<<<<< HEAD
            <Label>{t("pg.customers.deliveryRoute")}</Label>
            <Input name="delivery_route" />
          </div>
          <div>
            <Label>{t("pg.customers.defaultAddress")}</Label>
=======
            <Label>配送路线</Label>
            <Select name="route_id" defaultValue="">
              <option value="">（未分配）</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} · {r.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>路线站序（第几站）</Label>
            <Input name="route_stop_seq" type="number" min="1" placeholder="1" />
          </div>
          <div className="md:col-span-2">
            <Label>默认送货地址</Label>
>>>>>>> 81fe284f9fcafb093982c6de6b8a33316a2e38cc
            <Input name="default_address" />
          </div>
          {error && (
            <p className="md:col-span-2 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? t("pg.customers.saving") : t("pg.customers.createCustomer")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
