"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { useI18n } from "@/components/i18n/provider";
import { useToast } from "@/components/ui/toast";
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
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [qtyUnits, setQtyUnits] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const selected = products.find((p) => p.id === productId);

  const optionLabel = (p: ProductOpt) =>
    `${p.sku} · ${p.name} · ${formatMoney(Number(p.current_price))}`;

  // SKU 输入框与商品搜索框共同过滤同一份商品列表
  const filtered = useMemo(() => {
    const sku = skuInput.trim().toLowerCase();
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (sku && !p.sku.toLowerCase().includes(sku)) return false;
      if (tokens.length) {
        const hay = `${p.sku} ${p.name}`.toLowerCase();
        if (!tokens.every((tk) => hay.includes(tk))) return false;
      }
      return true;
    });
  }, [products, skuInput, search]);

  function selectProduct(p: ProductOpt) {
    setProductId(p.id);
    setSkuInput(p.sku);
    setSearch(optionLabel(p));
    setOpen(false);
    setError(null);
  }

  function clearSelection() {
    setProductId("");
  }

  // 点击外部关闭下拉
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function resetPicker() {
    setProductId("");
    setSkuInput("");
    setSearch("");
    setOpen(false);
  }

  const atpHint = useMemo(() => {
    if (!selected) return null;
    const atp = selected.atp_units;
    const qty = Number(qtyUnits);
    if (atp <= 0) {
      return {
        tone: "danger" as const,
        text: t("pg.sales.orders.atpNone"),
      };
    }
    if (Number.isFinite(qty) && qty > 0 && qty > atp) {
      return {
        tone: "warn" as const,
        text: t("pg.sales.orders.atpExceed")
          .replace("{qty}", String(qty))
          .replace("{atp}", String(atp)),
      };
    }
    return {
      tone: "ok" as const,
      text: t("pg.sales.orders.atpAvail").replace("{atp}", String(atp)),
    };
  }, [selected, qtyUnits, t]);

  const blocked =
    !!selected &&
    (selected.atp_units <= 0 ||
      (Number(qtyUnits) > 0 && Number(qtyUnits) > selected.atp_units));

  return (
    <form
      className="grid gap-3 md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (blocked) return;
        // 在 await 前捕获表单引用：React 在事件处理结束后会把 e.currentTarget 置空，
        // await 之后再读 e.currentTarget 会是 null（报 reading 'reset'）。
        const form = e.currentTarget;
        const fd = new FormData(form);
        setError(null);
        start(async () => {
          try {
            await addSoLine(salesOrderId, fd);
            form.reset();
            resetPicker();
            setQtyUnits("");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : t("pg.sales.orders.addFailed"));
          }
        });
      }}
    >
      <input type="hidden" name="product_id" value={productId} />
      <div>
        <Label>SKU</Label>
        <Input
          value={skuInput}
          placeholder={t("pg.sales.orders.skuPlaceholder")}
          autoComplete="off"
          onChange={(e) => {
            const v = e.target.value;
            setSkuInput(v);
            setOpen(true);
            setError(null);
            // 精确匹配某个 SKU 时直接选中
            const exact = products.find(
              (p) => p.sku.toLowerCase() === v.trim().toLowerCase(),
            );
            if (exact) {
              setProductId(exact.id);
              setSearch(optionLabel(exact));
            } else {
              clearSelection();
            }
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      <div className="relative md:col-span-2" ref={comboRef}>
        <Label>{t("pg.sales.common.product")}</Label>
        <Input
          value={search}
          placeholder={t("pg.sales.orders.productSearchPlaceholder")}
          autoComplete="off"
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            setError(null);
            clearSelection();
          }}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-stone-200 bg-white shadow-lg">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-stone-400">{t("pg.sales.orders.noMatch")}</div>
            ) : (
              filtered.slice(0, 50).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProduct(p)}
                  className={
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-teal-50 " +
                    (p.id === productId ? "bg-teal-50" : "")
                  }
                >
                  <span className="min-w-0 truncate text-stone-900">
                    <span className="font-medium">{p.sku}</span> · {p.name}
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">
                    {formatMoney(Number(p.current_price))} · ATP {p.atp_units}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        {atpHint && (
          <div
            className={
              atpHint.tone === "ok"
                ? "mt-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900"
                : atpHint.tone === "warn"
                  ? "mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                  : "mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            }
            role="status"
          >
            {atpHint.text}
          </div>
        )}
      </div>
      <div>
        <Label>{t("pg.sales.common.qty")}</Label>
        <Input
          name="qty_units"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={qtyUnits}
          onChange={(e) => setQtyUnits(e.target.value)}
          max={
            selected && selected.atp_units > 0 ? selected.atp_units : undefined
          }
        />
      </div>
      <div>
        <Label>{t("pg.sales.orders.estWeightLb")}</Label>
        <Input name="estimated_weight_lb" type="number" min="0" step="0.01" />
      </div>
      <div>
        <Label>{t("pg.sales.common.unitPrice")}</Label>
        <Input
          name="unit_price"
          type="number"
          min="0"
          step="0.01"
          placeholder={t("pg.sales.orders.pricePlaceholder")}
        />
      </div>
      <div className="md:col-span-6 space-y-2">
        {error && (
          <p className="whitespace-pre-wrap text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending || blocked || !productId}>
          {pending ? t("pg.sales.orders.adding") : t("pg.sales.orders.addLine")}
        </Button>
      </div>
    </form>
  );
}

export function ConfirmSoButton({
  salesOrderId,
  status,
}: {
  salesOrderId: string;
  status: string;
}) {
  const { t } = useI18n();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const confirmed = status === "confirmed";

  const runConfirm = () => {
    setError(null);
    start(async () => {
      try {
        const res = await confirmSalesOrder(salesOrderId);
        // 依三闸结果给出明确反馈
        if (res.status === "confirmed") {
          notify(t("pg.sales.orders.confirmedToast"), "success");
        } else if (res.status === "pending_approval") {
          notify(t("pg.sales.orders.needApprovalToast"), "error");
        } else if (res.status === "credit_hold") {
          notify(t("pg.sales.orders.creditHoldToast"), "error");
        }
        router.refresh();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : t("pg.sales.orders.submitFailed");
        setError(msg);
        notify(msg, "error");
      }
    });
  };

  return (
    <div className="space-y-2">
      {confirmed ? (
        // 已确认：显示通过态 + 次要「重新校验」入口，不再用醒目主按钮
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
            ✓ {t("pg.sales.orders.confirmedBadge")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={runConfirm}
          >
            {pending ? t("pg.sales.orders.checkingStock") : t("pg.sales.orders.revalidate")}
          </Button>
        </div>
      ) : (
        <Button type="button" disabled={pending} onClick={runConfirm}>
          {pending
            ? t("pg.sales.orders.checkingStock")
            : t("pg.sales.orders.confirmValidate")}
        </Button>
      )}
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
  const { t } = useI18n();
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
            setError(err instanceof Error ? err.message : t("pg.sales.orders.saveFailed"));
          }
        });
      }}
    >
      <div className="md:col-span-2">
        <div className="font-medium">
          {product?.sku} · {product?.name}
        </div>
        <div className="text-xs text-stone-500">
          {t("pg.sales.orders.lineMeta")
            .replace("{cost}", formatMoney(Number(line.cost_snapshot)))
            .replace("{margin}", marginPct.toFixed(1))
            .replace("{allocated}", String(line.allocated_units))}
        </div>
        {error && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-red-700">{error}</p>
        )}
      </div>
      <div>
        <Label>{t("pg.sales.common.qty")}</Label>
        <Input
          name="qty_units"
          type="number"
          step="0.01"
          defaultValue={line.qty_units}
          disabled={!unlocked}
        />
      </div>
      <div>
        <Label>{t("pg.sales.orders.estLb")}</Label>
        <Input
          name="estimated_weight_lb"
          type="number"
          step="0.01"
          defaultValue={line.estimated_weight_lb ?? ""}
          disabled={!unlocked || !line.is_catch_weight_snapshot}
        />
      </div>
      <div>
        <Label>{t("pg.sales.common.unitPrice")}</Label>
        <Input
          name="unit_price"
          type="number"
          step="0.01"
          defaultValue={line.unit_price}
          disabled={!unlocked}
        />
      </div>
      <div>
        <Label>{t("pg.sales.common.notes")}</Label>
        <Input
          name="notes"
          defaultValue={line.notes ?? ""}
          disabled={!unlocked}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {unlocked && (
          <>
            <Button
              size="sm"
              type="submit"
              disabled={pending}
              className="shrink-0 whitespace-nowrap"
            >
              {t("pg.sales.common.save")}
            </Button>
            <Button
              size="sm"
              variant="danger"
              type="button"
              disabled={pending}
              className="shrink-0 whitespace-nowrap"
              onClick={() =>
                start(async () => {
                  try {
                    await deleteSoLine(line.id, salesOrderId);
                    router.refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : t("pg.sales.orders.deleteFailed"));
                  }
                })
              }
            >
              {t("pg.sales.common.delete")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
