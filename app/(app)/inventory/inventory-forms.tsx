"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeReplenishment,
  createReplenishmentTask,
} from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/i18n/provider";

type Option = { id: string; label: string };

export function ReplenishmentCreateForm({
  products,
  pickLocations,
}: {
  products: Option[];
  pickLocations: Option[];
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <Card>
      <CardHeader><h2 className="text-lg font-semibold">{t("pg.inventory.createReplenishmentTaskTitle")}</h2></CardHeader>
      <CardBody>
        <form className="grid gap-4 md:grid-cols-5" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fd = new FormData(form);
          start(async () => {
            const result = await createReplenishmentTask({
              product_id: String(fd.get("product_id")),
              to_location_id: String(fd.get("to_location_id") || "") || null,
              qty_units: Number(fd.get("qty_units")),
              qty_weight_lb: Number(fd.get("qty_weight_lb")),
              reason: String(fd.get("reason") || "") || null,
            });
            if (!result.ok) setError(result.error);
            else { setError(null); form.reset(); router.refresh(); }
          });
        }}>
          <div><Label>{t("pg.inventory.colProduct")}</Label><Select name="product_id" required><option value="">{t("pg.inventory.selectPlaceholder")}</option>{products.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
          <div><Label>{t("pg.inventory.targetPickLocation")}</Label><Select name="to_location_id"><option value="">{t("pg.inventory.useDefaultPickLocation")}</option>{pickLocations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
          <div><Label>{t("pg.inventory.colUnits")}</Label><Input name="qty_units" type="number" min="0" step="0.001" defaultValue="0" required /></div>
          <div><Label>{t("pg.inventory.weightLbParen")}</Label><Input name="qty_weight_lb" type="number" min="0" step="0.001" defaultValue="0" required /></div>
          <div><Label>{t("pg.inventory.colReason")}</Label><Input name="reason" defaultValue={t("pg.inventory.replenishmentTitle")} /></div>
          {error && <p className="md:col-span-5 text-sm text-red-700">{error}</p>}
          <div className="md:col-span-5"><Button type="submit" disabled={pending}>{pending ? t("pg.inventory.creating") : t("pg.inventory.createTask")}</Button></div>
        </form>
      </CardBody>
    </Card>
  );
}

export function CompleteReplenishmentButton({ taskId }: { taskId: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return <div className="space-y-1"><Button size="sm" disabled={pending} onClick={() => start(async () => { const result = await completeReplenishment(taskId); if (!result.ok) setError(result.error); else router.refresh(); })}>{pending ? t("pg.inventory.processing") : t("pg.inventory.completeMove")}</Button>{error && <p className="text-xs text-red-700">{error}</p>}</div>;
}
