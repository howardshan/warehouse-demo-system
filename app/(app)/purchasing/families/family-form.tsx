"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProductFamily,
  updateProductFamily,
} from "@/app/actions/master-data";
import { ORDERING_UOMS } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/i18n/provider";

type Option = { id: string; name: string };

export function ProductFamilyCreateForm({
  suppliers,
  categories,
}: {
  suppliers: Option[];
  categories: Option[];
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">{t("pg.purchasing.newFamily")}</h2>
        <p className="text-sm text-stone-500">
          {t("pg.purchasing.newFamilyFormDesc")}
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            setError(null);
            const tareRaw = String(fd.get("outer_pack_weight_lb") || "").trim();
            start(async () => {
              const res = await createProductFamily({
                code: String(fd.get("code")),
                name: String(fd.get("name")),
                notes: String(fd.get("notes") || "") || null,
                supplier_id: String(fd.get("supplier_id")),
                category_id: String(fd.get("category_id")),
                purchase_uom: String(fd.get("purchase_uom") || "") || null,
                is_catch_weight: fd.get("is_catch_weight") === "on",
                outer_pack_weight_lb: tareRaw ? Number(tareRaw) : null,
                is_active: true,
              });
              if (!res.ok) setError(res.error);
              else {
                form.reset();
                router.push("/purchasing/families");
                router.refresh();
              }
            });
          }}
        >
          <div>
            <Label required>{t("pg.purchasing.supplier")}</Label>
            <Select name="supplier_id" required defaultValue="">
              <option value="" disabled>
                {t("pg.purchasing.selectSupplier")}
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>{t("pg.purchasing.category")}</Label>
            <Select name="category_id" required defaultValue="">
              <option value="" disabled>
                {t("pg.purchasing.selectCategory")}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-stone-500">
              {t("pg.purchasing.categoryMaintainHint")}
            </p>
          </div>
          <div>
            <Label required>{t("pg.purchasing.familyCode")}</Label>
            <Input
              name="code"
              placeholder="PEPPER"
              pattern="[A-Za-z0-9]+([_-][A-Za-z0-9]+)*"
              required
            />
            <p className="mt-1 text-xs text-stone-500">
              {t("pg.purchasing.familyCodeHint")}
            </p>
          </div>
          <div>
            <Label required>{t("pg.purchasing.familyName")}</Label>
            <Input name="name" placeholder={t("pg.purchasing.familyNamePlaceholder")} required />
          </div>
          <div>
            <Label required>{t("pg.purchasing.purchaseUom")}</Label>
            <Select name="purchase_uom" defaultValue="case" required>
              {ORDERING_UOMS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-2">
            <input
              id="is_catch_weight_create"
              name="is_catch_weight"
              type="checkbox"
              className="mb-1"
            />
            <div>
              <Label htmlFor="is_catch_weight_create" className="mb-0">
                {t("pg.purchasing.needCatchWeight")}
              </Label>
              <p className="mt-1 text-xs text-stone-500">
                {t("pg.purchasing.catchWeightHint")}
              </p>
            </div>
          </div>
          <div>
            <Label>{t("pg.purchasing.outerPackWeightOptional")}</Label>
            <Input
              name="outer_pack_weight_lb"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("pg.purchasing.emptyBoxPlaceholder")}
            />
          </div>
          <div>
            <Label>{t("pg.purchasing.notes")}</Label>
            <Input name="notes" placeholder={t("pg.purchasing.optional")} />
          </div>
          {error && (
            <p className="md:col-span-2 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={
                pending || suppliers.length === 0 || categories.length === 0
              }
            >
              {pending ? t("pg.purchasing.saving") : t("pg.purchasing.createFamily")}
            </Button>
            {suppliers.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                {t("pg.purchasing.addSupplierFirst")}
              </p>
            )}
            {categories.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                {t("pg.purchasing.addCategoryFirst")}
              </p>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function ProductFamilyEditForm({
  family,
  suppliers,
  categories,
}: {
  family: {
    id: string;
    code: string;
    name: string;
    notes: string | null;
    supplier_id: string | null;
    category_id: string | null;
    purchase_uom: string | null;
    outer_pack_weight_lb: number | null;
    is_catch_weight: boolean;
    is_active: boolean;
  };
  suppliers: Option[];
  categories: Option[];
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="grid gap-3 rounded-md border border-stone-100 p-3 md:grid-cols-6 md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        const tareRaw = String(fd.get("outer_pack_weight_lb") || "").trim();
        start(async () => {
          const res = await updateProductFamily(family.id, {
            code: String(fd.get("code")),
            name: String(fd.get("name")),
            notes: String(fd.get("notes") || "") || null,
            supplier_id: String(fd.get("supplier_id")),
            category_id: String(fd.get("category_id")),
            purchase_uom: String(fd.get("purchase_uom") || "") || null,
            is_catch_weight: fd.get("is_catch_weight") === "on",
            outer_pack_weight_lb: tareRaw ? Number(tareRaw) : null,
            is_active: String(fd.get("status")) !== "off",
          });
          if (!res.ok) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <div>
        <Label required>{t("pg.purchasing.supplier")}</Label>
        <Select
          name="supplier_id"
          defaultValue={family.supplier_id ?? ""}
          required
        >
          <option value="" disabled>
            {t("pg.purchasing.selectPlaceholder")}
          </option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label required>{t("pg.purchasing.category")}</Label>
        <Select
          name="category_id"
          defaultValue={family.category_id ?? ""}
          required
        >
          <option value="" disabled>
            {t("pg.purchasing.selectPlaceholder")}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label required>{t("pg.purchasing.code")}</Label>
        <Input name="code" defaultValue={family.code} required />
      </div>
      <div>
        <Label required>{t("pg.purchasing.name")}</Label>
        <Input name="name" defaultValue={family.name} required />
      </div>
      <div>
        <Label required>{t("pg.purchasing.purchaseUom")}</Label>
        <Select
          name="purchase_uom"
          defaultValue={family.purchase_uom ?? "case"}
          required
        >
          {ORDERING_UOMS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>{t("pg.purchasing.outerPackWeightLb")}</Label>
        <Input
          name="outer_pack_weight_lb"
          type="number"
          min="0"
          step="0.01"
          defaultValue={family.outer_pack_weight_lb ?? ""}
          placeholder={t("pg.purchasing.optional")}
        />
      </div>
      <div className="flex items-center gap-2 pb-2">
        <input
          id={`is_catch_weight_${family.id}`}
          name="is_catch_weight"
          type="checkbox"
          defaultChecked={family.is_catch_weight}
        />
        <Label htmlFor={`is_catch_weight_${family.id}`} className="mb-0">
          {t("pg.purchasing.needCatchWeight")}
        </Label>
      </div>
      <div>
        <Label>{t("pg.purchasing.status")}</Label>
        <Select name="status" defaultValue={family.is_active ? "on" : "off"}>
          <option value="on">{t("pg.purchasing.enabled")}</option>
          <option value="off">{t("pg.purchasing.disabled")}</option>
        </Select>
      </div>
      <div className="md:col-span-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <Label>{t("pg.purchasing.notes")}</Label>
          <Input name="notes" defaultValue={family.notes ?? ""} />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : t("pg.purchasing.save")}
        </Button>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </form>
  );
}
