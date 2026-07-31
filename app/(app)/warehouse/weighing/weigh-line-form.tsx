"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordWeight } from "@/app/actions/warehouse";
import { useI18n } from "@/components/i18n/provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type WeighLine = {
  id: string;
  sku: string;
  name: string;
  picked_units: number;
  tote_code: string;
};

export function WeighLineForm({ line }: { line: WeighLine }) {
  const { t } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid items-end gap-3 rounded border border-stone-100 p-4 md:grid-cols-[1fr_160px_160px_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const w = String(fd.get("actual_weight_lb") || "");
        setError(null);
        start(async () => {
          try {
            await recordWeight(line.id, fd);
            notify(
              t("pg.warehouse.weighedToast")
                .replace("{sku}", line.sku)
                .replace("{w}", w),
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
      <div>
        <div className="font-medium">
          {line.sku} · {line.name}
        </div>
        <div className="text-xs text-stone-500">
          {t("pg.warehouse.unitsSuffix").replace("{x}", String(line.picked_units))}
        </div>
        {error && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-red-700">{error}</p>
        )}
      </div>
      <div>
        <Label>{t("pg.warehouse.toteCode")}</Label>
        <Input
          name="tote_id"
          defaultValue={line.tote_code}
          placeholder={t("pg.warehouse.scanToteCode")}
          required
        />
      </div>
      <div>
        <Label>{t("pg.warehouse.actualWeightLb")}</Label>
        <Input
          name="actual_weight_lb"
          type="number"
          min="0"
          step="0.01"
          required
        />
      </div>
      <Button type="submit" disabled={pending} className="whitespace-nowrap">
        {pending ? "…" : t("pg.warehouse.confirmWeigh")}
      </Button>
    </form>
  );
}
