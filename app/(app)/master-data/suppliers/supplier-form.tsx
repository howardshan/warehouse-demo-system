"use client";

import { useState, useTransition } from "react";
import { createSupplier } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/components/i18n/provider";

export function SupplierCreateForm() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">
          {t("pg.masterData.suppliers.form.newTitle")}
        </h2>
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
            <Label>{t("pg.masterData.common.name")}</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>{t("pg.masterData.suppliers.contactHeader")}</Label>
            <Input name="contact" />
          </div>
          <div>
            <Label>{t("pg.masterData.suppliers.phoneHeader")}</Label>
            <Input name="phone" />
          </div>
          {error && (
            <p className="md:col-span-3 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending
                ? t("pg.masterData.common.saving")
                : t("pg.masterData.common.create")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
