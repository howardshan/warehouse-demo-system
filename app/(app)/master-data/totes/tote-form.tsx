"use client";

import { useState, useTransition } from "react";
import { createTote } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/components/i18n/provider";

export function ToteCreateForm() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">
          {t("pg.masterData.totes.form.newTitle")}
        </h2>
        <p className="text-sm text-stone-500">
          {t("pg.masterData.totes.form.newHint")}
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
            <Label>{t("pg.masterData.totes.codeHeader")}</Label>
            <Input name="code" placeholder="A17" required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "…" : t("pg.masterData.common.create")}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </CardBody>
    </Card>
  );
}
