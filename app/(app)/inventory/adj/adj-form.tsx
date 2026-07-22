"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type AdjStockOption = {
  id: string;
  label: string;
  qty_units: number;
  qty_weight_lb: number;
  allocated_units: number;
};

const REASONS = [
  { value: "stock_mismatch", label: "库存不符 / 盘点差异" },
  { value: "quality_reject", label: "质量拒收 / 损耗" },
  { value: "near_expiry", label: "临期报损" },
  { value: "underweight", label: "重量不足" },
  { value: "out_of_stock", label: "缺货 / 短少" },
  { value: "other", label: "其他" },
] as const;

export function StockAdjustForm({ stocks }: { stocks: AdjStockOption[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stockId, setStockId] = useState("");
  const router = useRouter();
  const selected = stocks.find((s) => s.id === stockId);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">新建库存调整 (ADJ)</h2>
        <p className="text-sm text-stone-500">
          选择现有库存行，填写调整后在手量。数量变更必须选择差异原因，并写入操作日志。
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
            <Label required>库存行</Label>
            <Select
              name="stock_id"
              required
              value={stockId}
              onChange={(e) => setStockId(e.target.value)}
            >
              <option value="" disabled>
                请选择商品 / 储位 / LOT
              </option>
              {stocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
            {selected && (
              <p className="mt-2 text-sm text-stone-600">
                当前在手：{selected.qty_units} 件 / {selected.qty_weight_lb} lb
                · 已占用 {selected.allocated_units} 件
              </p>
            )}
          </div>
          <div>
            <Label required>调整后件数</Label>
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
            <Label required>调整后重量 (lb)</Label>
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
            <Label required>差异原因</Label>
            <Select name="variance_reason" required defaultValue="">
              <option value="" disabled>
                请选择
              </option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>备注</Label>
            <Input name="notes" placeholder="可选说明" />
          </div>
          {error && (
            <p className="md:col-span-2 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending || !stockId}>
              {pending ? "提交中…" : "提交调整"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
