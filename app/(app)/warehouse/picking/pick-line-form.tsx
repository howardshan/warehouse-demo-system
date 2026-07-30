"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPick } from "@/app/actions/warehouse";
import { useI18n } from "@/components/i18n/provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const REASONS = [
  "out_of_stock",
  "stock_mismatch",
  "quality_reject",
  "near_expiry",
  "underweight",
  "customer_cancelled",
  "other",
];

export type PickLine = {
  id: string;
  sku: string;
  name: string;
  pick_number: string;
  line_no: number;
  location: string;
  lot_no: string;
  requested_units: number;
  status: string;
};

export function PickLineForm({
  line,
  totes,
}: {
  line: PickLine;
  totes: { id: string; code: string }[];
}) {
  const { t } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid items-end gap-3 rounded border border-stone-100 p-4 md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setError(null);
        start(async () => {
          try {
            await recordPick(line.id, fd);
            notify(
              t("pg.warehouse.pickedToast").replace("{sku}", line.sku),
              "success",
            );
            router.refresh();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "";
            setError(msg);
            notify(msg, "error");
          }
        });
      }}
    >
      <div className="md:col-span-2">
        <div className="font-medium">
          {line.sku} · {line.name}
        </div>
        <div className="text-xs text-stone-500">
          {line.pick_number} ·{" "}
          {t("pg.warehouse.lineLabel").replace("{x}", String(line.line_no))} ·{" "}
          {t("pg.warehouse.locationLabel").replace("{x}", line.location)} ·{" "}
          {t("pg.warehouse.batchLabel").replace("{x}", line.lot_no)}
        </div>
        {error && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-red-700">{error}</p>
        )}
      </div>
      <div>
        <Label>{t("pg.warehouse.requestedUnits")}</Label>
        <div className="h-10 py-2 font-semibold">{line.requested_units}</div>
      </div>
      <div>
        <Label>{t("pg.warehouse.pickedUnits")}</Label>
        <Input
          name="picked_units"
          type="number"
          step="0.01"
          min="0"
          defaultValue={line.requested_units}
          required
        />
      </div>
      <div>
        <Label>{t("pg.warehouse.tote")}</Label>
        <Select name="tote_id" required defaultValue="">
          <option value="" disabled>
            {t("pg.warehouse.scanOrSelect")}
          </option>
          {totes.map((tote) => (
            <option key={tote.id} value={tote.id}>
              {tote.code}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>{t("pg.warehouse.varianceReason")}</Label>
        <Select name="variance_reason" defaultValue="">
          <option value="">{t("pg.warehouse.noVariance")}</option>
          {REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </Select>
      </div>
      <div className="md:col-span-6">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : t("pg.warehouse.confirmPick")}
        </Button>
      </div>
    </form>
  );
}
