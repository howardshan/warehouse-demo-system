"use client";

import { useState, useTransition } from "react";
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

type LocationOption = { id: string; code: string; type: string };
type FamilyOption = { id: string; code: string; name: string };

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
};

function buildPayload(
  fd: FormData,
  opts: {
    sku: string;
    isCatch: boolean;
    orderingUom: string;
    mode: "create" | "edit";
  },
) {
  const familyId = String(fd.get("family_id") || "") || null;
  return {
    sku: opts.sku,
    name: String(fd.get("name")),
    temp_zone: String(fd.get("temp_zone")),
    is_catch_weight: opts.isCatch,
    ordering_uom: opts.orderingUom,
    pricing_uom: opts.isCatch
      ? "lb"
      : String(fd.get("pricing_uom") || opts.orderingUom),
    avg_weight_lb: opts.isCatch ? Number(fd.get("avg_weight_lb")) : null,
    current_price: Number(fd.get("current_price")),
    inspection_method: String(fd.get("inspection_method")),
    fixed_pick_location_id:
      String(fd.get("fixed_pick_location_id") || "") || null,
    shelf_life_days: fd.get("shelf_life_days")
      ? Number(fd.get("shelf_life_days"))
      : null,
    is_active: String(fd.get("status")) !== "off_shelf",
    family_id: familyId,
    family_code:
      opts.mode === "create" && !familyId
        ? String(fd.get("new_family_code") || "") || null
        : null,
    family_name:
      opts.mode === "create" && !familyId
        ? String(fd.get("new_family_name") || "") || null
        : null,
    pack_contains_qty: Number(fd.get("pack_contains_qty") || 1),
  };
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
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isCatch, setIsCatch] = useState(initial?.is_catch_weight ?? false);
  const [orderingUom, setOrderingUom] = useState(
    initial?.ordering_uom ?? "case",
  );
  const pickFaces = locations.filter((l) => l.type === "pick_face");

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">
          {mode === "create" ? "新建商品 / 包装 SKU" : `编辑商品 ${initial?.sku ?? ""}`}
        </h2>
        <p className="text-sm text-stone-500">
          {mode === "create"
            ? "同一原产品可建多个 SKU（箱装 / 包装）。订货单位从列表选择。"
            : "改主档售价只影响新单；历史订单行成交价不变。SKU 创建后不可修改。"}
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
            start(async () => {
              const payload = buildPayload(fd, {
                sku,
                isCatch,
                orderingUom,
                mode,
              });
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
                placeholder="GARLIC-CASE"
                pattern="[A-Za-z0-9]+([_-][A-Za-z0-9]+)*"
                title="仅字母、数字，可用 - 或 _ 分隔"
                autoCapitalize="characters"
                required
              />
            )}
            <p className="mt-1 text-xs text-stone-500">
              字母数字编码，例如 CHK-BR-10、GARLIC-BAG
            </p>
          </div>
          <div>
            <Label required>销售产品名称</Label>
            <Input
              name="name"
              placeholder="大蒜(箱)"
              defaultValue={initial?.name}
              required
            />
          </div>
          <div>
            <Label required>状态</Label>
            <Select
              name="status"
              defaultValue={initial?.is_active === false ? "off_shelf" : "on_shelf"}
            >
              <option value="on_shelf">上架</option>
              <option value="off_shelf">下架</option>
            </Select>
            <p className="mt-1 text-xs text-stone-500">
              下架后不可再加入新销售/采购单，历史单据不受影响
            </p>
          </div>
          <div>
            <Label>归属原产品</Label>
            <Select name="family_id" defaultValue={initial?.family_id ?? ""}>
              <option value="">— 无 —</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </Select>
          </div>
          {mode === "create" && (
            <>
              <div>
                <Label>或新建原产品编码</Label>
                <Input name="new_family_code" placeholder="GARLIC" />
              </div>
              <div>
                <Label>新建原产品名称</Label>
                <Input name="new_family_name" placeholder="大蒜 / Garlic" />
              </div>
            </>
          )}
          <div>
            <Label>本包装含量</Label>
            <Input
              name="pack_contains_qty"
              type="number"
              min="0.001"
              step="0.001"
              defaultValue={initial?.pack_contains_qty ?? 1}
              required
            />
            <p className="mt-1 text-xs text-stone-500">
              例：箱装填 4，表示 1 case = 4 bag
            </p>
          </div>
          <div>
            <Label>温区</Label>
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
            <Label>单价（售价）</Label>
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
              checked={isCatch}
              onChange={(e) => setIsCatch(e.target.checked)}
            />
            <Label htmlFor="is_catch_weight" className="mb-0">
              称重品 — 计价按 lb
            </Label>
          </div>
          <div>
            <Label>订货单位</Label>
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
          <div>
            <Label>计价单位</Label>
            {isCatch ? (
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
          {isCatch && (
            <div>
              <Label>均重 lb（仅预估）</Label>
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
            <Label>验收方式</Label>
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
            <Label>固定拣货位</Label>
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
            <Label>保质期(天)</Label>
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
                ? "保存中…"
                : mode === "create"
                  ? "创建商品"
                  : "保存修改"}
            </Button>
            {mode === "edit" && (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => router.push("/master-data/products")}
              >
                返回列表
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
