"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addSoLine,
  confirmSalesOrder,
  deleteSoLine,
  updateSoLine,
} from "@/app/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatMoney } from "@/lib/utils";

type ProductOpt = {
  id: string;
  sku: string;
  name: string;
  current_price: number;
  is_catch_weight: boolean;
  atp_units: number;
};

export function AddSoLineForm({
  salesOrderId,
  products,
}: {
  salesOrderId: string;
  products: ProductOpt[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const router = useRouter();
  const selected = products.find((p) => p.id === productId);

  return (
    <form
      className="grid gap-3 md:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            await addSoLine(salesOrderId, fd);
            e.currentTarget.reset();
            setProductId("");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "添加失败");
          }
        });
      }}
    >
      <div className="md:col-span-2">
        <Label>商品</Label>
        <Select
          name="product_id"
          required
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="" disabled>
            请选择商品
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} · {p.name} · {formatMoney(Number(p.current_price))} · ATP{" "}
              {p.atp_units}
            </option>
          ))}
        </Select>
        {selected && (
          <p className="mt-1 text-xs text-stone-500">
            可用库存（ATP）: {selected.atp_units} 件
          </p>
        )}
      </div>
      <div>
        <Label>件数</Label>
        <Input name="qty_units" type="number" min="0.01" step="0.01" required />
      </div>
      <div>
        <Label>预估重量(lb)</Label>
        <Input name="estimated_weight_lb" type="number" min="0" step="0.01" />
      </div>
      <div>
        <Label>单价</Label>
        <Input
          name="unit_price"
          type="number"
          min="0"
          step="0.01"
          placeholder="默认取主档现价"
        />
      </div>
      <div className="md:col-span-5 space-y-2">
        {error && (
          <p className="whitespace-pre-wrap text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "校验中…" : "添加并重新校验"}
        </Button>
      </div>
    </form>
  );
}

export function ConfirmSoButton({ salesOrderId }: { salesOrderId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            try {
              await confirmSalesOrder(salesOrderId);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "提交失败");
            }
          });
        }}
      >
        {pending ? "检查库存中…" : "确认并执行三重校验"}
      </Button>
      {error && (
        <p className="whitespace-pre-wrap text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function SoLineEditor({
  line,
  unlocked,
  salesOrderId,
  marginPct,
}: {
  line: {
    id: string;
    qty_units: number;
    estimated_weight_lb: number | null;
    unit_price: number;
    cost_snapshot: number;
    allocated_units: number;
    is_catch_weight_snapshot: boolean;
    notes: string | null;
    products: { sku: string; name: string } | null;
  };
  unlocked: boolean;
  salesOrderId: string;
  marginPct: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const product = line.products;

  return (
    <form
      className="grid items-end gap-3 rounded border border-stone-100 p-3 md:grid-cols-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (!unlocked) return;
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            await updateSoLine(line.id, salesOrderId, fd);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "保存失败");
          }
        });
      }}
    >
      <div className="md:col-span-2">
        <div className="font-medium">
          {product?.sku} · {product?.name}
        </div>
        <div className="text-xs text-stone-500">
          成本快照 {formatMoney(Number(line.cost_snapshot))} · 毛利{" "}
          {marginPct.toFixed(1)}% · 已分配 {line.allocated_units}
        </div>
        {error && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-red-700">{error}</p>
        )}
      </div>
      <div>
        <Label>件数</Label>
        <Input
          name="qty_units"
          type="number"
          step="0.01"
          defaultValue={line.qty_units}
          disabled={!unlocked}
        />
      </div>
      <div>
        <Label>预估 lb</Label>
        <Input
          name="estimated_weight_lb"
          type="number"
          step="0.01"
          defaultValue={line.estimated_weight_lb ?? ""}
          disabled={!unlocked || !line.is_catch_weight_snapshot}
        />
      </div>
      <div>
        <Label>单价</Label>
        <Input
          name="unit_price"
          type="number"
          step="0.01"
          defaultValue={line.unit_price}
          disabled={!unlocked}
        />
      </div>
      <div>
        <Label>备注</Label>
        <Input
          name="notes"
          defaultValue={line.notes ?? ""}
          disabled={!unlocked}
        />
      </div>
      <div className="flex gap-2">
        {unlocked && (
          <>
            <Button size="sm" type="submit" disabled={pending}>
              保存
            </Button>
            <Button
              size="sm"
              variant="danger"
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  try {
                    await deleteSoLine(line.id, salesOrderId);
                    router.refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "删除失败");
                  }
                })
              }
            >
              删除
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
