"use client";

import { FormEvent, useMemo, useRef, useState, useTransition } from "react";
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
  saveMatchVariances,
  saveSupplierClaims,
  saveSupplierInvoiceClaims,
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
  products: {
    id: string;
    sku: string;
    name: string;
    ordering_uom: string;
    pricing_uom: string;
    current_price: number;
    is_catch_weight: boolean;
    avg_weight_lb: number | null;
    pack_contains_qty: number;
    family_id: string | null;
    family_code: string | null;
    family_name: string | null;
    family_purchase_uom: string | null;
  }[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const router = useRouter();

  // 采购：只展示可采购 SKU（每原产品通常一个单位）
  const purchaseProducts = useMemo(
    () =>
      [...products].sort((a, b) =>
        (a.family_name ?? a.name).localeCompare(b.family_name ?? b.name),
      ),
    [products],
  );
  const selected =
    purchaseProducts.find((p) => p.id === productId) ?? null;

  const priceHint = selected
    ? `$${Number(selected.current_price).toFixed(2)} / ${selected.pricing_uom}`
    : "";

  return (
    <form
      className="grid gap-3 md:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selected) {
          setError("请选择采购商品");
          return;
        }
        const form = event.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const result = await addPoLine(poId, {
            product_id: selected.id,
            qty_units: Number(fd.get("qty_units")),
            estimated_weight_lb: Number(fd.get("estimated_weight_lb")) || null,
            unit_cost: Number(fd.get("unit_cost")),
          });
          if (!result.ok) setError(result.error);
          else {
            setError(null);
            form.reset();
            setProductId("");
            router.refresh();
          }
        });
      }}
    >
      <div className="md:col-span-2">
        <Label>采购商品</Label>
        <Select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
        >
          <option value="">请选择（按采购单位）</option>
          {purchaseProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {(p.family_name ?? p.name) +
                ` · ${p.ordering_uom}` +
                ` · ${p.sku}`}
            </option>
          ))}
        </Select>
        {selected && (
          <p className="mt-1 text-xs text-stone-500">
            采购单位：{selected.ordering_uom}
            {selected.family_purchase_uom
              ? `（原产品约定 ${selected.family_purchase_uom}）`
              : ""}
            。销售拆包转换请在商品主数据维护，不在此选择。
          </p>
        )}
      </div>
      <div>
        <Label>数量（{selected?.ordering_uom || "采购单位"}）</Label>
        <Input name="qty_units" type="number" min="0.001" step="0.001" required />
      </div>
      <div>
        <Label>预计重量（lb）</Label>
        <Input
          name="estimated_weight_lb"
          type="number"
          min="0"
          step="0.001"
          placeholder={selected?.is_catch_weight ? "称重品建议填写" : "可选"}
        />
      </div>
      <div>
        <Label>单价</Label>
        <Input
          name="unit_cost"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={selected ? String(selected.current_price) : ""}
          key={selected?.id ?? "none"}
        />
        <p className="mt-1 text-xs text-stone-500">{priceHint}</p>
      </div>
      <div className="md:col-span-5 space-y-2">
        <FormMessage error={error} />
        <Button type="submit" disabled={pending || !selected}>
          {pending ? "添加中…" : "添加明细"}
        </Button>
      </div>
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
    <Card><CardHeader><h2 className="text-lg font-semibold">开始收货</h2>
      <p className="text-sm text-stone-500">创建        创建后分别录入：现场盲收 → Shipping List → Invoice → 单据核对（互不可见对方数量）。
      </p>
    </CardHeader><CardBody>
      <form className="grid gap-4 md:grid-cols-3" onSubmit={(event) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        start(async () => {
          const result = await createGoodsReceipt(String(fd.get("purchase_order_id")), { supplier_document_no: String(fd.get("supplier_document_no") || "") || null });
          if (!result.ok) setError(result.error); else router.push(`/purchasing/receiving/${result.id}`);
        });
      }}>
        <div><Label>已签发采购单</Label><Select name="purchase_order_id" required><option value="">请选择</option>{purchaseOrders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
        <div><Label>Shipping List 号（选填，可后补）</Label><Input name="supplier_document_no" placeholder="送货单号" /></div>
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
  actual_units: number;
  actual_weight_lb: number;
  lot_no: string;
  expiry_date: string | null;
  notes: string | null;
  is_catch_weight: boolean;
};

export type DeliveryNoteLine = {
  id: string;
  sku: string;
  productName: string;
  supplier_claimed_units: number;
};

export type InvoiceLine = {
  id: string;
  sku: string;
  productName: string;
  invoice_claimed_units: number;
  invoice_claimed_weight_lb: number | null;
  is_catch_weight: boolean;
};

export type MatchLine = {
  id: string;
  sku: string;
  productName: string;
  ordered_units: number;
  supplier_claimed_units: number;
  invoice_claimed_units: number;
  invoice_claimed_weight_lb: number | null;
  actual_units: number;
  actual_weight_lb: number;
  is_catch_weight: boolean;
  variance_reason: string | null;
  weightWarning?: boolean;
  weightVariancePct?: number | null;
};

/** 铁律 13：盲收现场只录实收，不含供应商声称数量 */
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
      actual_units: Number(fd.get(`actual_${index}`)),
      actual_weight_lb: line.is_catch_weight
        ? Number(fd.get(`weight_${index}`))
        : 0,
      lot_no: String(fd.get(`lot_${index}`)),
      expiry_date: String(fd.get(`expiry_${index}`) || "") || null,
      notes: String(fd.get(`notes_${index}`) || "") || null,
    }));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    start(async () => {
      const result = await saveGrLines(receiptId, readLines(fd));
      if (!result.ok) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-4">
      {lines.map((line, index) => (
        <Card key={line.id}>
          <CardHeader>
            <div className="font-semibold">
              {line.productName}{" "}
              <span className="ml-2 font-mono text-xs text-stone-500">
                {line.sku}
              </span>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-4">
            <div>
              <Label required>实际件数</Label>
              <Input
                name={`actual_${index}`}
                type="number"
                min="0"
                step="0.001"
                defaultValue={line.actual_units}
                disabled={!editable}
                required
              />
            </div>
            {line.is_catch_weight ? (
              <div>
                <Label required>实际重量（lb）</Label>
                <Input
                  name={`weight_${index}`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  defaultValue={
                    line.actual_weight_lb > 0 ? line.actual_weight_lb : ""
                  }
                  disabled={!editable}
                  required
                />
              </div>
            ) : (
              <div>
                <Label>实际重量</Label>
                <p className="mt-2 text-sm text-stone-400">非称重品，无需填写</p>
              </div>
            )}
            <div>
              <Label required>供应商批号 / LOT</Label>
              <Input
                name={`lot_${index}`}
                defaultValue={line.lot_no === "__PENDING__" ? "" : line.lot_no}
                disabled={!editable}
                required
              />
            </div>
            <div>
              <Label>效期（选填）</Label>
              <Input
                name={`expiry_${index}`}
                type="date"
                defaultValue={line.expiry_date || ""}
                disabled={!editable}
              />
            </div>
            <div className="md:col-span-4">
              <Label>备注（选填）</Label>
              <Input
                name={`notes_${index}`}
                defaultValue={line.notes || ""}
                disabled={!editable}
              />
            </div>
          </CardBody>
        </Card>
      ))}
      <FormMessage error={error} />
      {editable && (
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存盲收结果"}
        </Button>
      )}
    </form>
  );
}

/** Shipping List / 送货单页：只录声称件数，不展示实收/订购/发票 */
export function SupplierDeliveryNoteForm({
  receiptId,
  lines,
  status,
  supplierDocumentNo,
}: {
  receiptId: string;
  lines: DeliveryNoteLine[];
  status: string;
  supplierDocumentNo: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const editable = status === "draft";

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    start(async () => {
      const payload = lines.map((line, index) => ({
        id: line.id,
        supplier_claimed_units: Number(fd.get(`claimed_${index}`)),
      }));
      const result = await saveSupplierClaims(receiptId, payload, {
        supplier_document_no: String(fd.get("supplier_document_no") || "") || null,
      });
      if (!result.ok) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold">单据号</h3>
        </CardHeader>
        <CardBody>
          <div className="max-w-md">
            <Label required>Shipping List 号（送货单号）</Label>
            <Input
              name="supplier_document_no"
              defaultValue={supplierDocumentNo ?? ""}
              disabled={!editable}
              required
              placeholder="供应商送货单 / packing list 号"
            />
          </div>
        </CardBody>
      </Card>
      {lines.map((line, index) => (
        <Card key={line.id}>
          <CardHeader>
            <div className="font-semibold">
              {line.productName}{" "}
              <span className="ml-2 font-mono text-xs text-stone-500">
                {line.sku}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="max-w-xs">
              <Label required>Shipping List 声称件数</Label>
              <Input
                name={`claimed_${index}`}
                type="number"
                min="0.001"
                step="0.001"
                defaultValue={
                  line.supplier_claimed_units > 0
                    ? line.supplier_claimed_units
                    : ""
                }
                disabled={!editable}
                required
              />
            </div>
          </CardBody>
        </Card>
      ))}
      <FormMessage error={error} />
      {editable && (
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存 Shipping List"}
        </Button>
      )}
    </form>
  );
}

/** Invoice / 发票页：只录发票声称件数，不展示实收/订购/送货单 */
export function SupplierInvoiceForm({
  receiptId,
  lines,
  status,
  supplierInvoiceNo,
}: {
  receiptId: string;
  lines: InvoiceLine[];
  status: string;
  supplierInvoiceNo: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const editable = status === "draft";

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    start(async () => {
      const payload = lines.map((line, index) => ({
        id: line.id,
        invoice_claimed_units: Number(fd.get(`invoice_${index}`)),
        invoice_claimed_weight_lb: line.is_catch_weight
          ? Number(fd.get(`invoice_weight_${index}`))
          : null,
      }));
      const result = await saveSupplierInvoiceClaims(receiptId, payload, {
        supplier_invoice_no: String(fd.get("supplier_invoice_no") || "") || null,
      });
      if (!result.ok) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold">单据号</h3>
        </CardHeader>
        <CardBody>
          <div className="max-w-md">
            <Label required>Invoice 号（发票号）</Label>
            <Input
              name="supplier_invoice_no"
              defaultValue={supplierInvoiceNo ?? ""}
              disabled={!editable}
              required
              placeholder="供应商发票号"
            />
          </div>
        </CardBody>
      </Card>
      {lines.map((line, index) => (
        <Card key={line.id}>
          <CardHeader>
            <div className="font-semibold">
              {line.productName}{" "}
              <span className="ml-2 font-mono text-xs text-stone-500">
                {line.sku}
              </span>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div className="max-w-xs">
              <Label required>Invoice 声称件数</Label>
              <Input
                name={`invoice_${index}`}
                type="number"
                min="0.001"
                step="0.001"
                defaultValue={
                  line.invoice_claimed_units > 0
                    ? line.invoice_claimed_units
                    : ""
                }
                disabled={!editable}
                required
              />
            </div>
            {line.is_catch_weight && (
              <div className="max-w-xs">
                <Label required>Invoice 声称重量（lb）</Label>
                <Input
                  name={`invoice_weight_${index}`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  defaultValue={
                    line.invoice_claimed_weight_lb != null &&
                    line.invoice_claimed_weight_lb > 0
                      ? line.invoice_claimed_weight_lb
                      : ""
                  }
                  disabled={!editable}
                  required
                />
              </div>
            )}
          </CardBody>
        </Card>
      ))}
      <FormMessage error={error} />
      {editable && (
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存 Invoice"}
        </Button>
      )}
    </form>
  );
}

/** 单据核对：首次同时展示订购 / Shipping List / Invoice / 实收 */
export function ThreeWayMatchForm({
  receiptId,
  lines,
  status,
}: {
  receiptId: string;
  lines: MatchLine[];
  status: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const editable = status === "draft";

  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const fd = new FormData(event.currentTarget);
          start(async () => {
            const payload = lines.map((line, index) => ({
              id: line.id,
              variance_reason: String(fd.get(`reason_${index}`) || "") || null,
            }));
            const saved = await saveMatchVariances(receiptId, payload);
            if (!saved.ok) {
              setError(saved.error);
              return;
            }
            const result = await submitGoodsReceipt(receiptId);
            if (!result.ok) setError(result.error);
            else {
              setError(null);
              router.refresh();
            }
          });
        }}
      >
        {lines.map((line, index) => {
          const shipping = Number(line.supplier_claimed_units);
          const invoice = Number(line.invoice_claimed_units);
          const actual = Number(line.actual_units);
          const ordered = Number(line.ordered_units);
          const needsReason =
            actual !== shipping || actual !== invoice || shipping !== invoice;
          const fourWayMismatch =
            needsReason ||
            ordered !== shipping ||
            ordered !== invoice ||
            ordered !== actual;
          return (
            <Card key={line.id}>
              <CardHeader>
                <div className="font-semibold">
                  {line.productName}{" "}
                  <span className="ml-2 font-mono text-xs text-stone-500">
                    {line.sku}
                  </span>
                  {line.is_catch_weight && (
                    <span className="ml-2 text-xs font-normal text-teal-800">
                      称重
                    </span>
                  )}
                </div>
                {fourWayMismatch && (
                  <p className="mt-1 text-xs text-amber-700">单据数量不一致</p>
                )}
                {line.weightWarning && (
                  <p className="mt-1 text-xs text-amber-700">
                    重量偏差警告：Invoice{" "}
                    {line.invoice_claimed_weight_lb ?? "—"} lb vs 实收{" "}
                    {line.actual_weight_lb} lb
                    {line.weightVariancePct != null
                      ? `（偏差 ${line.weightVariancePct.toFixed(1)}%，超过公司阈值）`
                      : ""}
                    。不阻断核对，请人工复核。
                  </p>
                )}
              </CardHeader>
              <CardBody className="space-y-4">
                <div
                  className={
                    needsReason
                      ? "grid gap-4 md:grid-cols-5"
                      : "grid gap-4 md:grid-cols-4"
                  }
                >
                  <div>
                    <div className="text-xs text-stone-500">订购件数</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {ordered}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500">Shipping List</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {shipping}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500">Invoice 件数</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {invoice}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500">现场实收件数</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {actual}
                    </div>
                  </div>
                  {needsReason && (
                    <div>
                      <Label required>差异原因</Label>
                      <Select
                        name={`reason_${index}`}
                        defaultValue={line.variance_reason || ""}
                        disabled={!editable}
                        required
                      >
                        <option value="" disabled>
                          请选择差异原因
                        </option>
                        <option value="out_of_stock">缺货</option>
                        <option value="stock_mismatch">库存不符</option>
                        <option value="quality_reject">质量拒收</option>
                        <option value="near_expiry">临期</option>
                        <option value="underweight">重量不足</option>
                        <option value="other">其他</option>
                      </Select>
                      <p className="mt-1 text-xs text-stone-500">
                        实收 / Shipping List / Invoice 不一致时必填
                      </p>
                    </div>
                  )}
                </div>
                {line.is_catch_weight && (
                  <div className="grid gap-4 rounded-md border border-stone-100 bg-stone-50/80 p-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-stone-500">
                        Invoice 声称重量
                      </div>
                      <div className="mt-1 font-semibold tabular-nums">
                        {line.invoice_claimed_weight_lb ?? "—"} lb
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-500">现场实收重量</div>
                      <div className="mt-1 font-semibold tabular-nums">
                        {line.actual_weight_lb} lb
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
        <FormMessage error={error} />
        {editable && (
          <Button type="submit" disabled={pending}>
            {pending ? "核对中…" : "提交核对"}
          </Button>
        )}
      </form>
      {status === "matched" && (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await postGoodsReceipt(receiptId);
              if (!result.ok) setError(result.error);
              else router.refresh();
            })
          }
        >
          {pending ? "过账中…" : "过账入库"}
        </Button>
      )}
    </div>
  );
}

export function AlertActions({ alertId }: { alertId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await repriceFromAlert(alertId);
              if (!result.ok) setError(result.error);
              else router.refresh();
            })
          }
        >
          一键调价
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await dismissAlert(alertId);
              if (!result.ok) setError(result.error);
              else router.refresh();
            })
          }
        >
          忽略
        </Button>
      </div>
      <FormMessage error={error} />
    </div>
  );
}
