"use client";

import { useState, useTransition } from "react";
import { createProduct } from "@/app/actions/master-data";
import {
  INSPECTION_METHODS,
  TEMP_ZONES,
} from "@/lib/domain/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type LocationOption = { id: string; code: string; type: string };

export function ProductCreateForm({
  locations,
}: {
  locations: LocationOption[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isCatch, setIsCatch] = useState(false);
  const pickFaces = locations.filter((l) => l.type === "pick_face");

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">新建商品</h2>
        <p className="text-sm text-stone-500">
          称重品必须双单位；均重仅用于预估，不会自动填入实重（铁律 3）。
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              const res = await createProduct({
                sku: String(fd.get("sku")),
                name: String(fd.get("name")),
                temp_zone: String(fd.get("temp_zone")),
                is_catch_weight: isCatch,
                ordering_uom: String(fd.get("ordering_uom")),
                pricing_uom: String(fd.get("pricing_uom")),
                avg_weight_lb: isCatch
                  ? Number(fd.get("avg_weight_lb"))
                  : null,
                current_price: Number(fd.get("current_price")),
                inspection_method: String(fd.get("inspection_method")),
                fixed_pick_location_id:
                  String(fd.get("fixed_pick_location_id") || "") || null,
                shelf_life_days: fd.get("shelf_life_days")
                  ? Number(fd.get("shelf_life_days"))
                  : null,
                is_active: true,
              });
              if (!res.ok) setError(res.error);
              else e.currentTarget.reset();
            });
          }}
        >
          <div>
            <Label>SKU</Label>
            <Input name="sku" required />
          </div>
          <div>
            <Label>名称</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>温区</Label>
            <Select name="temp_zone" defaultValue="chilled">
              {TEMP_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>当前售价</Label>
            <Input
              name="current_price"
              type="number"
              step="0.01"
              min="0"
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
              称重品 (catch weight) — 计价按 lb，ATP 按件数
            </Label>
          </div>
          <div>
            <Label>订货单位 ordering_uom</Label>
            <Input name="ordering_uom" placeholder="case / pc / bag" required />
          </div>
          <div>
            <Label>计价单位 pricing_uom</Label>
            <Input
              name="pricing_uom"
              placeholder={isCatch ? "lb" : "case / pc"}
              defaultValue={isCatch ? "lb" : ""}
              required
            />
          </div>
          {isCatch && (
            <div>
              <Label>均重 avg_weight_lb（仅预估）</Label>
              <Input
                name="avg_weight_lb"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </div>
          )}
          <div>
            <Label>验收方式</Label>
            <Select name="inspection_method" defaultValue="skip">
              {INSPECTION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>固定拣货位</Label>
            <Select name="fixed_pick_location_id" defaultValue="">
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
            <Input name="shelf_life_days" type="number" min="1" />
          </div>
          {error && (
            <p className="md:col-span-2 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "保存中…" : "创建商品"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
