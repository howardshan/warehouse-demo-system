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
import { useI18n } from "@/components/i18n/provider";

type Option = { id: string; label: string };

function FormMessage({ error }: { error: string | null }) {
  return error ? <p className="text-sm text-red-700">{error}</p> : null;
}

export function PoCreateForm({ suppliers }: { suppliers: Option[] }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card>
      <CardHeader><h2 className="text-lg font-semibold">{t("pg.purchasing.newPurchaseOrder")}</h2></CardHeader>
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
          <div><Label>{t("pg.purchasing.supplier")}</Label><Select name="supplier_id" required><option value="">{t("pg.purchasing.selectPlaceholder")}</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
          <div><Label>{t("pg.purchasing.orderDateLabel")}</Label><Input name="order_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
          <div><Label>{t("pg.purchasing.expectedDateLabel")}</Label><Input name="expected_date" type="date" /></div>
          <div><Label>{t("pg.purchasing.currency")}</Label><Input name="currency_code" defaultValue="USD" maxLength={3} required /></div>
          <div><Label>{t("pg.purchasing.notes")}</Label><Input name="notes" /></div>
          <div className="md:col-span-5 space-y-2"><FormMessage error={error} /><Button type="submit" disabled={pending}>{pending ? t("pg.purchasing.creating") : t("pg.purchasing.createPo")}</Button></div>
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
  const { t } = useI18n();
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
          setError(t("pg.purchasing.selectProduct"));
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
        <Label>{t("pg.purchasing.purchaseProduct")}</Label>
        <Select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
        >
          <option value="">{t("pg.purchasing.selectByOrderingUom")}</option>
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
            {t("pg.purchasing.orderingUnitPrefix")}{selected.ordering_uom}
            {selected.family_purchase_uom
              ? t("pg.purchasing.familyAgreedUom").replace("{x}", selected.family_purchase_uom)
              : ""}
            {t("pg.purchasing.sellPackConversionHint")}
          </p>
        )}
      </div>
      <div>
        <Label>{t("pg.purchasing.qtyLabel").replace("{x}", selected?.ordering_uom || t("pg.purchasing.purchaseUom"))}</Label>
        <Input name="qty_units" type="number" min="0.001" step="0.001" required />
      </div>
      <div>
        <Label>{t("pg.purchasing.estimatedWeightLbLabel")}</Label>
        <Input
          name="estimated_weight_lb"
          type="number"
          min="0"
          step="0.001"
          placeholder={selected?.is_catch_weight ? t("pg.purchasing.catchWeightSuggest") : t("pg.purchasing.optional")}
        />
      </div>
      <div>
        <Label>{t("pg.purchasing.unitPrice")}</Label>
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
          {pending ? t("pg.purchasing.addingLine") : t("pg.purchasing.addLine")}
        </Button>
      </div>
    </form>
  );
}

export function IssuePoButton({ poId }: { poId: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return <div className="space-y-2"><Button disabled={pending} onClick={() => start(async () => { const result = await issuePO(poId); if (!result.ok) setError(result.error); else router.refresh(); })}>{pending ? t("pg.purchasing.issuingPo") : t("pg.purchasing.issuePo")}</Button><FormMessage error={error} /></div>;
}

export function StartReceivingForm({ purchaseOrders }: { purchaseOrders: Option[] }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <Card><CardHeader><h2 className="text-lg font-semibold">{t("pg.purchasing.startReceiving")}</h2>
      <p className="text-sm text-stone-500">{t("pg.purchasing.startReceivingDesc")}
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
        <div><Label>{t("pg.purchasing.issuedPo")}</Label><Select name="purchase_order_id" required><option value="">{t("pg.purchasing.selectPlaceholder")}</option>{purchaseOrders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></div>
        <div><Label>{t("pg.purchasing.shippingListNoOptional")}</Label><Input name="supplier_document_no" placeholder={t("pg.purchasing.deliveryNoPlaceholder")} /></div>
        <div className="flex items-end"><Button type="submit" disabled={pending}>{pending ? t("pg.purchasing.creating") : t("pg.purchasing.startReceiving")}</Button></div>
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
  const { t } = useI18n();
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
              <Label required>{t("pg.purchasing.actualUnits")}</Label>
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
                <Label required>{t("pg.purchasing.actualWeightLb")}</Label>
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
                <Label>{t("pg.purchasing.actualWeight")}</Label>
                <p className="mt-2 text-sm text-stone-400">{t("pg.purchasing.nonCatchWeightNote")}</p>
              </div>
            )}
            <div>
              <Label required>{t("pg.purchasing.supplierLotNo")}</Label>
              <Input
                name={`lot_${index}`}
                defaultValue={line.lot_no === "__PENDING__" ? "" : line.lot_no}
                disabled={!editable}
                required
              />
            </div>
            <div>
              <Label>{t("pg.purchasing.expiryOptional")}</Label>
              <Input
                name={`expiry_${index}`}
                type="date"
                defaultValue={line.expiry_date || ""}
                disabled={!editable}
              />
            </div>
            <div className="md:col-span-4">
              <Label>{t("pg.purchasing.notesOptional")}</Label>
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
          {pending ? t("pg.purchasing.saving") : t("pg.purchasing.saveBlind")}
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
  const { t } = useI18n();
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
          <h3 className="font-semibold">{t("pg.purchasing.documentNo")}</h3>
        </CardHeader>
        <CardBody>
          <div className="max-w-md">
            <Label required>{t("pg.purchasing.shippingListNo")}</Label>
            <Input
              name="supplier_document_no"
              defaultValue={supplierDocumentNo ?? ""}
              disabled={!editable}
              required
              placeholder={t("pg.purchasing.shippingListPlaceholder")}
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
              <Label required>{t("pg.purchasing.shippingListClaimedUnits")}</Label>
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
          {pending ? t("pg.purchasing.saving") : t("pg.purchasing.saveShippingList")}
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
  const { t } = useI18n();
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
          <h3 className="font-semibold">{t("pg.purchasing.documentNo")}</h3>
        </CardHeader>
        <CardBody>
          <div className="max-w-md">
            <Label required>{t("pg.purchasing.invoiceNo")}</Label>
            <Input
              name="supplier_invoice_no"
              defaultValue={supplierInvoiceNo ?? ""}
              disabled={!editable}
              required
              placeholder={t("pg.purchasing.invoicePlaceholder")}
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
              <Label required>{t("pg.purchasing.invoiceClaimedUnits")}</Label>
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
                <Label required>{t("pg.purchasing.invoiceClaimedWeightLb")}</Label>
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
          {pending ? t("pg.purchasing.saving") : t("pg.purchasing.saveInvoice")}
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
  const { t } = useI18n();
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
                      {t("pg.purchasing.catchWeight")}
                    </span>
                  )}
                </div>
                {fourWayMismatch && (
                  <p className="mt-1 text-xs text-amber-700">{t("pg.purchasing.documentQtyMismatch")}</p>
                )}
                {line.weightWarning && (
                  <p className="mt-1 text-xs text-amber-700">
                    {t("pg.purchasing.weightVarianceWarningPrefix")}Invoice{" "}
                    {line.invoice_claimed_weight_lb ?? "—"} lb vs {t("pg.purchasing.actualReceived")}{" "}
                    {line.actual_weight_lb} lb
                    {line.weightVariancePct != null
                      ? t("pg.purchasing.weightVarianceDeviation").replace("{x}", line.weightVariancePct.toFixed(1))
                      : ""}
                    {t("pg.purchasing.weightVarianceReviewNote")}
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
                    <div className="text-xs text-stone-500">{t("pg.purchasing.orderedUnits")}</div>
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
                    <div className="text-xs text-stone-500">{t("pg.purchasing.invoiceUnits")}</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {invoice}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500">{t("pg.purchasing.actualReceivedUnits")}</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {actual}
                    </div>
                  </div>
                  {needsReason && (
                    <div>
                      <Label required>{t("pg.purchasing.varianceReason")}</Label>
                      <Select
                        name={`reason_${index}`}
                        defaultValue={line.variance_reason || ""}
                        disabled={!editable}
                        required
                      >
                        <option value="" disabled>
                          {t("pg.purchasing.selectVarianceReason")}
                        </option>
                        <option value="out_of_stock">{t("pg.purchasing.reasonOutOfStock")}</option>
                        <option value="stock_mismatch">{t("pg.purchasing.reasonStockMismatch")}</option>
                        <option value="quality_reject">{t("pg.purchasing.reasonQualityReject")}</option>
                        <option value="near_expiry">{t("pg.purchasing.reasonNearExpiry")}</option>
                        <option value="underweight">{t("pg.purchasing.reasonUnderweight")}</option>
                        <option value="other">{t("pg.purchasing.reasonOther")}</option>
                      </Select>
                      <p className="mt-1 text-xs text-stone-500">
                        {t("pg.purchasing.varianceReasonRequired")}
                      </p>
                    </div>
                  )}
                </div>
                {line.is_catch_weight && (
                  <div className="grid gap-4 rounded-md border border-stone-100 bg-stone-50/80 p-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-stone-500">
                        {t("pg.purchasing.invoiceClaimedWeight")}
                      </div>
                      <div className="mt-1 font-semibold tabular-nums">
                        {line.invoice_claimed_weight_lb ?? "—"} lb
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-500">{t("pg.purchasing.actualReceivedWeight")}</div>
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
            {pending ? t("pg.purchasing.matching") : t("pg.purchasing.submitMatch")}
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
          {pending ? t("pg.purchasing.posting") : t("pg.purchasing.postGr")}
        </Button>
      )}
    </div>
  );
}

export function AlertActions({ alertId }: { alertId: string }) {
  const { t } = useI18n();
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
          {t("pg.purchasing.repriceOneClick")}
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
          {t("pg.purchasing.dismiss")}
        </Button>
      </div>
      <FormMessage error={error} />
    </div>
  );
}
