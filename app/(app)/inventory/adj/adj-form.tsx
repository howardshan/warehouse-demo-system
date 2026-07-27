"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/i18n/provider";

export type AdjStockOption = {
  id: string;
  label: string;
  qty_units: number;
  qty_weight_lb: number;
  allocated_units: number;
};

const REASONS = [
  { value: "stock_mismatch", labelKey: "pg.inventory.reasonStockMismatch" },
  { value: "quality_reject", labelKey: "pg.inventory.reasonQualityReject" },
  { value: "near_expiry", labelKey: "pg.inventory.reasonNearExpiry" },
  { value: "underweight", labelKey: "pg.inventory.reasonUnderweight" },
  { value: "out_of_stock", labelKey: "pg.inventory.reasonOutOfStock" },
  { value: "other", labelKey: "pg.inventory.reasonOther" },
] as const;

export function StockAdjustForm({ stocks }: { stocks: AdjStockOption[] }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stockId, setStockId] = useState("");
  const router = useRouter();
  const selected = stocks.find((s) => s.id === stockId);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">{t("pg.inventory.newAdjTitle")}</h2>
        <p className="text-sm text-stone-500">
          {t("pg.inventory.newAdjDesc")}
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              const res = await adjustStock({
                stock_id: String(fd.get("stock_id")),
                after_units: Number(fd.get("after_units")),
                after_weight_lb: Number(fd.get("after_weight_lb")),
                variance_reason: String(fd.get("variance_reason")),
                notes: String(fd.get("notes") || "") || null,
              });
              if (!res.ok) setError(res.error);
              else {
                e.currentTarget.reset();
                setStockId("");
                router.refresh();
              }
            });
          }}
        >
          <div className="md:col-span-2">
            <Label required>{t("pg.inventory.stockRow")}</Label>
            <Select
              name="stock_id"
              required
              value={stockId}
              onChange={(e) => setStockId(e.target.value)}
            >
              <option value="" disabled>
                {t("pg.inventory.selectStockPlaceholder")}
              </option>
              {stocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
            {selected && (
              <p className="mt-2 text-sm text-stone-600">
                {t("pg.inventory.currentOnHand")
                  .replace("{u}", String(selected.qty_units))
                  .replace("{w}", String(selected.qty_weight_lb))
                  .replace("{a}", String(selected.allocated_units))}
              </p>
            )}
          </div>
          <div>
            <Label required>{t("pg.inventory.afterUnits")}</Label>
            <Input
              name="after_units"
              type="number"
              min="0"
              step="0.001"
              defaultValue={selected?.qty_units}
              key={`u-${stockId}`}
              required
            />
          </div>
          <div>
            <Label required>{t("pg.inventory.afterWeight")}</Label>
            <Input
              name="after_weight_lb"
              type="number"
              min="0"
              step="0.001"
              defaultValue={selected?.qty_weight_lb}
              key={`w-${stockId}`}
              required
            />
          </div>
          <div>
            <Label required>{t("pg.inventory.varianceReason")}</Label>
            <Select name="variance_reason" required defaultValue="">
              <option value="" disabled>
                {t("pg.inventory.selectPlaceholder")}
              </option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(r.labelKey)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("pg.inventory.notes")}</Label>
            <Input name="notes" placeholder={t("pg.inventory.notesPlaceholder")} />
          </div>
          {error && (
            <p className="md:col-span-2 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending || !stockId}>
              {pending ? t("pg.inventory.submitting") : t("pg.inventory.submitAdj")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
