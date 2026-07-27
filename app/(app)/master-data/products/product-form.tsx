"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "@/app/actions/master-data";
import {
  INSPECTION_METHODS,
  ORDERING_UOMS,
  TEMP_ZONES,
} from "@/lib/domain/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/components/i18n/provider";

type LocationOption = { id: string; code: string; type: string };
type FamilyOption = {
  id: string;
  code: string;
  name: string;
  purchase_uom: string | null;
  outer_pack_weight_lb: number | null;
  supplier_name: string | null;
  is_catch_weight: boolean;
};

export type ProductFormValues = {
  id?: string;
  sku: string;
  name: string;
  temp_zone: string;
  is_catch_weight: boolean;
  ordering_uom: string;
  pricing_uom: string;
  avg_weight_lb: number | null;
  current_price: number;
  inspection_method: string;
  fixed_pick_location_id: string | null;
  shelf_life_days: number | null;
  is_active: boolean;
  family_id: string | null;
  pack_contains_qty: number;
  is_purchasable: boolean;
  is_sellable: boolean;
  requires_debox: boolean;
};

function roleFromFlags(purchasable: boolean, sellable: boolean) {
  // 不再支持「采购且销售」；历史 both 记录编辑时默认归为采购包装
  if (purchasable && !sellable) return "purchase";
  if (sellable && !purchasable) return "sell";
  if (purchasable) return "purchase";
  return "sell";
}

export function ProductForm({
  mode,
  locations,
  families,
  initial,
}: {
  mode: "create" | "edit";
  locations: LocationOption[];
  families: FamilyOption[];
  initial?: ProductFormValues;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isCatch, setIsCatch] = useState(initial?.is_catch_weight ?? false);
  const [orderingUom, setOrderingUom] = useState(
    initial?.ordering_uom ?? "case",
  );
  const [familyId, setFamilyId] = useState(initial?.family_id ?? "");
  const [role, setRole] = useState<"purchase" | "sell">(
    roleFromFlags(initial?.is_purchasable ?? false, initial?.is_sellable ?? true),
  );
  const [requiresDebox, setRequiresDebox] = useState(
    initial?.requires_debox ?? false,
  );
  const pickFaces = locations.filter((l) => l.type === "pick_face");

  const selectedFamily = useMemo(
    () => families.find((f) => f.id === familyId) ?? null,
    [families, familyId],
  );
  const purchaseUom = selectedFamily?.purchase_uom || orderingUom;
  const canDebox = role === "sell";
  const familyTare =
    selectedFamily?.outer_pack_weight_lb != null
      ? Number(selectedFamily.outer_pack_weight_lb)
      : null;
  // 原产品称重标记优先；新建时随原产品同步
  const familyCatch = selectedFamily?.is_catch_weight;
  const effectiveCatch =
    familyCatch != null ? familyCatch : isCatch;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">
          {mode === "create"
            ? t("pg.masterData.products.form.newTitle")
            : t("pg.masterData.products.form.editTitle").replace(
                "{sku}",
                initial?.sku ?? "",
              )}
        </h2>
        <p className="text-sm text-stone-500">
          {t("pg.masterData.products.form.intro")}
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            const sku =
              mode === "edit" && initial
                ? initial.sku
                : String(fd.get("sku"));
            const isPurchasable = role === "purchase";
            const isSellable = role === "sell";
            const packQty = Number(fd.get("pack_contains_qty"));
            if (!familyId) {
              setError(t("pg.masterData.products.form.errFamily"));
              return;
            }
            if (!Number.isFinite(packQty) || packQty <= 0) {
              setError(t("pg.masterData.products.form.errConversion"));
              return;
            }
            start(async () => {
              const payload = {
                sku,
                name: String(fd.get("name")),
                temp_zone: String(fd.get("temp_zone")),
                is_catch_weight: effectiveCatch,
                ordering_uom: orderingUom,
                pricing_uom: effectiveCatch
                  ? "lb"
                  : String(fd.get("pricing_uom") || orderingUom),
                avg_weight_lb: effectiveCatch
                  ? Number(fd.get("avg_weight_lb"))
                  : null,
                current_price: Number(fd.get("current_price")),
                inspection_method: String(fd.get("inspection_method")),
                fixed_pick_location_id:
                  String(fd.get("fixed_pick_location_id") || "") || null,
                shelf_life_days: fd.get("shelf_life_days")
                  ? Number(fd.get("shelf_life_days"))
                  : null,
                is_active: String(fd.get("status")) !== "off_shelf",
                family_id: familyId,
                family_code: null,
                family_name: null,
                pack_contains_qty: packQty,
                is_purchasable: isPurchasable,
                is_sellable: isSellable,
                requires_debox: isSellable ? requiresDebox : false,
              };
              const res =
                mode === "edit" && initial?.id
                  ? await updateProduct(initial.id, payload)
                  : await createProduct(payload);
              if (!res.ok) {
                setError(res.error);
                return;
              }
              if (mode === "create") {
                e.currentTarget.reset();
                setIsCatch(false);
                setOrderingUom("case");
                setFamilyId("");
                setRole("sell");
                setRequiresDebox(false);
                router.refresh();
              } else {
                router.push("/master-data/products");
                router.refresh();
              }
            });
          }}
        >
          <div>
            <Label required>SKU</Label>
            {mode === "edit" ? (
              <Input name="sku" value={initial?.sku ?? ""} readOnly />
            ) : (
              <Input
                name="sku"
                placeholder="GARLIC-BAG"
                pattern="[A-Za-z0-9]+([_-][A-Za-z0-9]+)*"
                required
              />
            )}
          </div>
          <div>
            <Label required>
              {t("pg.masterData.products.form.saleNameLabel")}
            </Label>
            <Input
              name="name"
              placeholder={t("pg.masterData.products.form.saleNamePlaceholder")}
              defaultValue={initial?.name}
              required
            />
          </div>
          <div>
            <Label required>{t("pg.masterData.common.status")}</Label>
            <Select
              name="status"
              defaultValue={
                initial?.is_active === false ? "off_shelf" : "on_shelf"
              }
            >
              <option value="on_shelf">
                {t("pg.masterData.common.onShelf")}
              </option>
              <option value="off_shelf">
                {t("pg.masterData.common.offShelf")}
              </option>
            </Select>
          </div>
          <div>
            <Label required>
              {t("pg.masterData.products.form.packUsageLabel")}
            </Label>
            <Select
              value={role}
              onChange={(e) => {
                const next = e.target.value as "purchase" | "sell";
                setRole(next);
                if (next === "purchase") setRequiresDebox(false);
              }}
            >
              <option value="purchase">
                {t("pg.masterData.products.form.purchaseOnly")}
              </option>
              <option value="sell">
                {t("pg.masterData.products.form.sellOnly")}
              </option>
            </Select>
            <p className="mt-1 text-xs text-stone-500">
              {t("pg.masterData.products.form.packUsageHint")}
            </p>
          </div>
          <div>
            <Label required>
              {t("pg.masterData.products.form.familyLabel")}
            </Label>
            <Select
              name="family_id"
              value={familyId}
              onChange={(e) => {
                const next = e.target.value;
                setFamilyId(next);
                const fam = families.find((f) => f.id === next);
                if (fam) setIsCatch(fam.is_catch_weight);
              }}
              required
            >
              <option value="">
                {t("pg.masterData.products.form.selectFamily")}
              </option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                  {f.supplier_name ? ` · ${f.supplier_name}` : ""}
                  {f.purchase_uom
                    ? ` · ${t(
                        "pg.masterData.products.form.purchaseUomOption",
                      ).replace("{uom}", f.purchase_uom)}`
                    : ""}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-stone-500">
              {t("pg.masterData.products.form.familyHint")}
            </p>
          </div>
          <div>
            <Label required>
              {t("pg.masterData.products.form.packUomLabel")}
            </Label>
            <Select
              value={orderingUom}
              onChange={(e) => setOrderingUom(e.target.value)}
              required
            >
              {ORDERING_UOMS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2 rounded-md border border-teal-200 bg-teal-50/60 p-4">
            <Label required>
              {t("pg.masterData.products.form.conversionLabel")}
            </Label>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">1</span>
              <span className="rounded bg-white px-2 py-1 font-mono text-xs">
                {purchaseUom || t("pg.masterData.common.purchaseUomFallback")}
              </span>
              <span className="font-medium">=</span>
              <Input
                name="pack_contains_qty"
                type="number"
                min="0.001"
                step="0.001"
                className="w-28"
                defaultValue={
                  initial?.pack_contains_qty ?? (role === "purchase" ? 1 : "")
                }
                required
              />
              <span className="rounded bg-white px-2 py-1 font-mono text-xs">
                {orderingUom}
              </span>
            </div>
            <p className="mt-2 text-xs text-teal-900">
              {t("pg.masterData.products.form.conversionHint")}
            </p>
          </div>

          {canDebox && (
            <div className="md:col-span-2 rounded-md border border-stone-200 bg-stone-50/80 p-4">
              <div className="flex items-start gap-2">
                <input
                  id="requires_debox"
                  type="checkbox"
                  className="mt-1"
                  checked={requiresDebox}
                  onChange={(e) => setRequiresDebox(e.target.checked)}
                />
                <div>
                  <Label htmlFor="requires_debox" className="mb-0">
                    {t("pg.masterData.products.form.deboxLabel")}
                  </Label>
                  <p className="mt-1 text-xs text-stone-500">
                    {t("pg.masterData.products.form.deboxHint")}
                    {familyTare != null && familyTare > 0
                      ? ` ${t(
                          "pg.masterData.products.form.deboxTareHint",
                        ).replace("{tare}", String(familyTare))}`
                      : familyId
                        ? ` ${t("pg.masterData.products.form.deboxNoTareHint")}`
                        : ` ${t("pg.masterData.products.form.deboxSelectFamilyHint")}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>{t("pg.masterData.common.tempZone")}</Label>
            <Select
              name="temp_zone"
              defaultValue={initial?.temp_zone ?? "ambient"}
            >
              {TEMP_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("pg.masterData.products.form.priceLabel")}</Label>
            <Input
              name="current_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.current_price}
              required
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="is_catch_weight"
              type="checkbox"
              checked={effectiveCatch}
              disabled={familyCatch != null}
              onChange={(e) => setIsCatch(e.target.checked)}
            />
            <Label htmlFor="is_catch_weight" className="mb-0">
              {t("pg.masterData.products.form.catchWeightLabel")}
              {familyCatch != null && (
                <span className="ml-2 text-xs font-normal text-stone-500">
                  {t("pg.masterData.products.form.catchWeightFollowHint")}
                </span>
              )}
            </Label>
          </div>
          <div>
            <Label>{t("pg.masterData.products.form.pricingUomLabel")}</Label>
            {effectiveCatch ? (
              <Input name="pricing_uom" value="lb" readOnly />
            ) : (
              <Select
                name="pricing_uom"
                defaultValue={initial?.pricing_uom ?? orderingUom}
                key={`${orderingUom}-${initial?.id ?? "new"}`}
              >
                {ORDERING_UOMS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            )}
          </div>
          {effectiveCatch && (
            <div>
              <Label>{t("pg.masterData.products.form.avgWeightLabel")}</Label>
              <Input
                name="avg_weight_lb"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={initial?.avg_weight_lb ?? undefined}
                required
              />
            </div>
          )}
          <div>
            <Label>{t("pg.masterData.products.form.inspectionLabel")}</Label>
            <Select
              name="inspection_method"
              defaultValue={initial?.inspection_method ?? "skip"}
            >
              {INSPECTION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("pg.masterData.products.form.fixedPickLabel")}</Label>
            <Select
              name="fixed_pick_location_id"
              defaultValue={initial?.fixed_pick_location_id ?? ""}
            >
              <option value="">—</option>
              {pickFaces.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("pg.masterData.products.form.shelfLifeLabel")}</Label>
            <Input
              name="shelf_life_days"
              type="number"
              min="1"
              defaultValue={initial?.shelf_life_days ?? undefined}
            />
          </div>
          {error && (
            <p className="md:col-span-2 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending
                ? t("pg.masterData.common.saving")
                : mode === "create"
                  ? t("pg.masterData.products.form.createBtn")
                  : t("pg.masterData.products.form.saveBtn")}
            </Button>
            {mode === "edit" && (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => router.push("/master-data/products")}
              >
                {t("pg.masterData.products.form.backBtn")}
              </Button>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function ProductCreateForm({
  locations,
  families,
}: {
  locations: LocationOption[];
  families: FamilyOption[];
}) {
  return (
    <ProductForm mode="create" locations={locations} families={families} />
  );
}
