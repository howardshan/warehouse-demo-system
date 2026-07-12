"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeReplenishment,
  createReplenishmentTask,
} from "@/app/actions/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Option = { id: string; label: string };

export function ReplenishmentCreateForm({
  products,
  pickLocations,
}: {
  products: Option[];
  pickLocations: Option[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <Card>
      <CardHeader><h2 className="text-lg font-semibold">创建 FEFO 补货任务</h2></CardHeader>
      <CardBody>
        <form className="grid gap-4 md:grid-cols-5" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fd = new FormData(form);
          start(async () => {
            const result = await createReplenishmentTask({
              product_id: String(fd.get("product_id")),
              to_location_id: String(fd.get("to_location_id") || "") || null,
              qty_units: Number(fd.get("qty_units")),
              qty_weight_lb: Number(fd.get("qty_weight_lb")),
              reason: String(fd.get("reason") || "") || null,
            });
            if (!result.ok) setError(result.error);
            else { setError(null); form.reset(); router.refresh(); }
          });
        }}>
          <div><Label>商品</Label><Select name="product_id" required><option value="">请选择</option>{products.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
          <div><Label>目标拣货位</Label><Select name="to_location_id"><option value="">使用商品固定拣货位</option>{pickLocations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
          <div><Label>件数</Label><Input name="qty_units" type="number" min="0" step="0.001" defaultValue="0" required /></div>
          <div><Label>重量（lb）</Label><Input name="qty_weight_lb" type="number" min="0" step="0.001" defaultValue="0" required /></div>
          <div><Label>原因</Label><Input name="reason" defaultValue="FEFO 补货" /></div>
          {error && <p className="md:col-span-5 text-sm text-red-700">{error}</p>}
          <div className="md:col-span-5"><Button type="submit" disabled={pending}>{pending ? "创建中…" : "创建任务"}</Button></div>
        </form>
      </CardBody>
    </Card>
  );
}

export function CompleteReplenishmentButton({ taskId }: { taskId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return <div className="space-y-1"><Button size="sm" disabled={pending} onClick={() => start(async () => { const result = await completeReplenishment(taskId); if (!result.ok) setError(result.error); else router.refresh(); })}>{pending ? "处理中…" : "完成搬运"}</Button>{error && <p className="text-xs text-red-700">{error}</p>}</div>;
}
