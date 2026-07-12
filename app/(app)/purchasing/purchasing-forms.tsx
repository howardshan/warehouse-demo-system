"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addPoLine,
  createGoodsReceipt,
  createPO,
  dismissAlert,
  issuePO,
  postGoodsReceipt,
  repriceFromAlert,
  saveGrLines,
  submitGoodsReceipt,
} from "@/app/actions/purchasing";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Option = { id: string; label: string };

function FormMessage({ error }: { error: string | null }) {
  return error ? <p className="text-sm text-red-700">{error}</p> : null;
}

export function PoCreateForm({ suppliers }: { suppliers: Option[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card>
      <CardHeader><h2 className="text-lg font-semibold">新建采购订单</h2></CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            setError(null);
            start(async () => {
              const result = await createPO({
                supplier_id: String(fd.get("supplier_id")),
                order_date: String(fd.get("order_date")),
                expected_date: String(fd.get("expected_date") || "") || null,
                currency_code: String(fd.get("currency_code") || "USD"),
                notes: String(fd.get("notes") || "") || null,
              });
              if (!result.ok) setError(result.error);
              else router.push(`/purchasing/pos/${result.id}`);
            });
          }}
        >
          <div><Label>供应商</Label><Select name="supplier_id" required><option value="">请选择</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
          <div><Label>订单日期</Label><Input name="order_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
          <div><Label>预计到货日</Label><Input name="expected_date" type="date" /></div>
          <div><Label>币种</Label><Input name="currency_code" defaultValue="USD" maxLength={3} required /></div>
          <div><Label>备注</Label><Input name="notes" /></div>
          <div className="md:col-span-5 space-y-2"><FormMessage error={error} /><Button type="submit" disabled={pending}>{pending ? "创建中…" : "创建采购单"}</Button></div>
        </form>
      </CardBody>
    </Card>
  );
}

export function PoLineForm({
  poId,
  products,
}: {
  poId: string;
  products: Option[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="grid gap-3 md:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const result = await addPoLine(poId, {
            product_id: String(fd.get("product_id")),
            qty_units: Number(fd.get("qty_units")),
            estimated_weight_lb: Number(fd.get("estimated_weight_lb")) || null,
            unit_cost: Number(fd.get("unit_cost")),
          });
          if (!result.ok) setError(result.error);
          else {
            setError(null);
            form.reset();
            router.refresh();
          }
        });
      }}
    >
      <div className="md:col-span-2"><Label>商品</Label><Select name="product_id" required><option value="">请选择</option>{products.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
      <div><Label>订购件数</Label><Input name="qty_units" type="number" min="0.001" step="0.001" required /></div>
      <div><Label>预计重量（lb）</Label><Input name="estimated_weight_lb" type="number" min="0" step="0.001" /></div>
      <div><Label>单位成本</Label><Input name="unit_cost" type="number" min="0" step="0.01" required /></div>
      <div className="md:col-span-5 space-y-2"><FormMessage error={error} /><Button type="submit" disabled={pending}>{pending ? "添加中…" : "添加明细"}</Button></div>
    </form>
  );
}

export function IssuePoButton({ poId }: { poId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return <div className="space-y-2"><Button disabled={pending} onClick={() => start(async () => { const result = await issuePO(poId); if (!result.ok) setError(result.error); else router.refresh(); })}>{pending ? "签发中…" : "签发采购单"}</Button><FormMessage error={error} /></div>;
}

export function StartReceivingForm({ purchaseOrders }: { purchaseOrders: Option[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <Card><CardHeader><h2 className="text-lg font-semibold">开始盲收</h2></CardHeader><CardBody>
      <form className="grid gap-4 md:grid-cols-3" onSubmit={(event) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        start(async () => {
          const result = await createGoodsReceipt(String(fd.get("purchase_order_id")), { supplier_document_no: String(fd.get("supplier_document_no") || "") || null });
          if (!result.ok) setError(result.error); else router.push(`/purchasing/receiving/${result.id}`);
        });
      }}>
        <div><Label>已签发采购单</Label><Select name="purchase_order_id" required><option value="">请选择</option>{purchaseOrders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
        <div><Label>供应商送货单号</Label><Input name="supplier_document_no" /></div>
        <div className="flex items-end"><Button type="submit" disabled={pending}>{pending ? "创建中…" : "开始收货"}</Button></div>
        <div className="md:col-span-3"><FormMessage error={error} /></div>
      </form>
    </CardBody></Card>
  );
}

export type BlindGrLine = {
  id: string;
  sku: string;
  productName: string;
  supplier_claimed_units: number;
  actual_units: number;
  actual_weight_lb: number;
  lot_no: string;
  expiry_date: string | null;
  variance_reason: string | null;
  notes: string | null;
};

export function BlindReceivingForm({
  receiptId,
  lines,
  status,
}: {
  receiptId: string;
  lines: BlindGrLine[];
  status: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const editable = status === "draft";
  const formRef = useRef<HTMLFormElement>(null);

  function readLines(fd: FormData) {
    return lines.map((line, index) => ({
      id: line.id,
      supplier_claimed_units: Number(fd.get(`claimed_${index}`)),
      actual_units: Number(fd.get(`actual_${index}`)),
      actual_weight_lb: Number(fd.get(`weight_${index}`)),
      lot_no: String(fd.get(`lot_${index}`)),
      expiry_date: String(fd.get(`expiry_${index}`) || "") || null,
      variance_reason: String(fd.get(`reason_${index}`) || "") || null,
      notes: String(fd.get(`notes_${index}`) || "") || null,
    }));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    start(async () => {
      const result = await saveGrLines(receiptId, readLines(fd));
      if (!result.ok) setError(result.error);
      else { setError(null); router.refresh(); }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-4">
      {lines.map((line, index) => (
        <Card key={line.id}>
          <CardHeader><div className="font-semibold">{line.productName} <span className="ml-2 font-mono text-xs text-stone-500">{line.sku}</span></div></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-4">
            <div><Label>供应商声称件数</Label><Input name={`claimed_${index}`} type="number" min="0" step="0.001" defaultValue={line.supplier_claimed_units} disabled={!editable} required /></div>
            <div><Label>实际件数</Label><Input name={`actual_${index}`} type="number" min="0" step="0.001" defaultValue={line.actual_units} disabled={!editable} required /></div>
            <div><Label>实际重量（lb）</Label><Input name={`weight_${index}`} type="number" min="0" step="0.001" defaultValue={line.actual_weight_lb} disabled={!editable} required /></div>
            <div><Label>供应商批号 / LOT</Label><Input name={`lot_${index}`} defaultValue={line.lot_no === "__PENDING__" ? "" : line.lot_no} disabled={!editable} required /></div>
            <div><Label>效期</Label><Input name={`expiry_${index}`} type="date" defaultValue={line.expiry_date || ""} disabled={!editable} /></div>
            <div><Label>差异原因</Label><Select name={`reason_${index}`} defaultValue={line.variance_reason || ""} disabled={!editable}><option value="">无差异</option><option value="out_of_stock">缺货</option><option value="stock_mismatch">库存不符</option><option value="quality_reject">质量拒收</option><option value="near_expiry">临期</option><option value="underweight">重量不足</option><option value="other">其他</option></Select></div>
            <div className="md:col-span-2"><Label>备注</Label><Input name={`notes_${index}`} defaultValue={line.notes || ""} disabled={!editable} /></div>
          </CardBody>
        </Card>
      ))}
      <FormMessage error={error} />
      {editable && <div className="flex gap-3"><Button type="submit" disabled={pending}>{pending ? "保存中…" : "保存盲收结果"}</Button><Button type="button" variant="secondary" disabled={pending} onClick={() => start(async () => { if (!formRef.current) return; const saved = await saveGrLines(receiptId, readLines(new FormData(formRef.current))); if (!saved.ok) { setError(saved.error); return; } const result = await submitGoodsReceipt(receiptId); if (!result.ok) setError(result.error); else router.refresh(); })}>保存并三单核对</Button></div>}
      {status === "matched" && <Button type="button" disabled={pending} onClick={() => start(async () => { const result = await postGoodsReceipt(receiptId); if (!result.ok) setError(result.error); else router.refresh(); })}>{pending ? "过账中…" : "过账入库"}</Button>}
    </form>
  );
}

export function AlertActions({ alertId }: { alertId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return <div className="space-y-2"><div className="flex gap-2"><Button size="sm" disabled={pending} onClick={() => start(async () => { const result = await repriceFromAlert(alertId); if (!result.ok) setError(result.error); else router.refresh(); })}>一键调价</Button><Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { const result = await dismissAlert(alertId); if (!result.ok) setError(result.error); else router.refresh(); })}>忽略</Button></div><FormMessage error={error} /></div>;
}
