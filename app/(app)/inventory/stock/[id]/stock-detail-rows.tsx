"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "@/app/actions/inventory";
import { useI18n } from "@/components/i18n/provider";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type DetailRow = {
  stockId: string;
  locationCode: string;
  locationType: string;
  lotNo: string;
  expiry: string | null;
  status: string;
  qtyUnits: number;
  qtyWeight: number;
  allocatedUnits: number;
  allocatedWeight: number;
};

const REASONS = [
  { value: "stock_mismatch", labelKey: "pg.inventory.reasonStockMismatch" },
  { value: "quality_reject", labelKey: "pg.inventory.reasonQualityReject" },
  { value: "near_expiry", labelKey: "pg.inventory.reasonNearExpiry" },
  { value: "underweight", labelKey: "pg.inventory.reasonUnderweight" },
  { value: "out_of_stock", labelKey: "pg.inventory.reasonOutOfStock" },
  { value: "other", labelKey: "pg.inventory.reasonOther" },
] as const;

export function StockDetailRows({
  rows,
  isCatchWeight,
}: {
  rows: DetailRow[];
  isCatchWeight: boolean;
}) {
  const { t } = useI18n();
  const { notify } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">
                {t("pg.inventory.colLocation")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("pg.inventory.colLotExpiry")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("pg.inventory.colBatchStatus")}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                {t("pg.inventory.colOnHandUnits")}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                {t("pg.inventory.colOnHandWeight")}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                {t("pg.inventory.colAllocatedUnits")}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                {t("pg.inventory.colAction")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isEditing = editing === r.stockId;
              return (
                <Fragment key={r.stockId}>
                  <tr className="border-b border-stone-100 even:bg-stone-50/40">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">
                        {r.locationCode}
                      </span>{" "}
                      <Badge className="ml-1">{r.locationType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{r.lotNo}</span>
                      <div className="text-xs text-stone-400">
                        {r.expiry ?? t("pg.inventory.noExpiry")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.qtyUnits}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.qtyWeight > 0 ? `${r.qtyWeight} lb` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.allocatedUnits}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditing(isEditing ? null : r.stockId)
                        }
                      >
                        {t("pg.inventory.adjustAction")}
                      </Button>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="bg-stone-50/60">
                      <td colSpan={7} className="px-4 py-4">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            start(async () => {
                              const res = await adjustStock({
                                stock_id: r.stockId,
                                after_units: Number(fd.get("after_units")),
                                after_weight_lb: isCatchWeight
                                  ? Number(fd.get("after_weight_lb"))
                                  : r.qtyWeight,
                                variance_reason: String(
                                  fd.get("variance_reason"),
                                ),
                                notes: String(fd.get("notes") || "") || null,
                              });
                              if (!res.ok) {
                                notify(res.error, "error");
                              } else {
                                notify(t("pg.inventory.adjSaved"));
                                setEditing(null);
                                router.refresh();
                              }
                            });
                          }}
                          className="grid gap-3 md:grid-cols-4"
                        >
                          <p className="md:col-span-4 text-sm text-stone-600">
                            {t("pg.inventory.currentOnHand")
                              .replace("{u}", String(r.qtyUnits))
                              .replace("{w}", String(r.qtyWeight))
                              .replace("{a}", String(r.allocatedUnits))}
                          </p>
                          <div>
                            <Label required>
                              {t("pg.inventory.afterUnits")}
                            </Label>
                            <Input
                              name="after_units"
                              type="number"
                              min="0"
                              step="0.001"
                              defaultValue={r.qtyUnits}
                              required
                            />
                          </div>
                          {isCatchWeight && (
                            <div>
                              <Label required>
                                {t("pg.inventory.afterWeight")}
                              </Label>
                              <Input
                                name="after_weight_lb"
                                type="number"
                                min="0"
                                step="0.001"
                                defaultValue={r.qtyWeight}
                                required
                              />
                            </div>
                          )}
                          <div>
                            <Label required>
                              {t("pg.inventory.varianceReason")}
                            </Label>
                            <Select name="variance_reason" required defaultValue="">
                              <option value="" disabled>
                                {t("pg.inventory.selectPlaceholder")}
                              </option>
                              {REASONS.map((reason) => (
                                <option key={reason.value} value={reason.value}>
                                  {t(reason.labelKey)}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <Label>{t("pg.inventory.notes")}</Label>
                            <Input
                              name="notes"
                              placeholder={t("pg.inventory.notesPlaceholder")}
                            />
                          </div>
                          <div className="flex items-center gap-2 md:col-span-4">
                            <Button type="submit" size="sm" disabled={pending}>
                              {pending
                                ? t("pg.inventory.submitting")
                                : t("pg.inventory.submitAdj")}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={pending}
                              onClick={() => setEditing(null)}
                            >
                              {t("common.cancel")}
                            </Button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!rows.length && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-stone-400"
                >
                  {t("pg.inventory.stockDetailEmpty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
