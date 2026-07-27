"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSalesOrder } from "@/app/actions/sales";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Customer = { id: string; code: string; name: string };
type Address = {
  id: string;
  customer_id: string;
  label: string | null;
  address: string;
  is_default: boolean | null;
};

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function NewOrderForm({
  customers,
  addresses,
}: {
  customers: Customer[];
  addresses: Address[];
}) {
  const { t } = useI18n();
  const [customerId, setCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [tomorrow, setTomorrow] = useState("");
  const comboRef = useRef<HTMLDivElement>(null);

  // Compute "tomorrow" on the client to use the viewer's timezone and avoid an
  // SSR/CSR hydration mismatch.
  useEffect(() => setTomorrow(tomorrowISO()), []);

  const label = (c: Customer) => `${c.code} · ${c.name}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(q));
  }, [customers, search]);

  const custAddresses = useMemo(
    () => addresses.filter((a) => a.customer_id === customerId),
    [addresses, customerId],
  );
  const defaultAddr = custAddresses.find((a) => a.is_default);

  function selectCustomer(c: Customer) {
    setCustomerId(c.id);
    setSearch(label(c));
    setOpen(false);
  }

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

  return (
    <form action={createSalesOrder} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="customer_id" value={customerId} />

      {/* 客户 — 手动输入过滤 */}
      <div className="relative" ref={comboRef}>
        <Label>{t("pg.sales.common.customer")}</Label>
        <Input
          value={search}
          placeholder={t("pg.sales.orders.selectCustomer")}
          autoComplete="off"
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            setCustomerId("");
          }}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-stone-200 bg-white shadow-lg">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-stone-400">
                {t("pg.sales.orders.noMatch")}
              </div>
            ) : (
              filtered.slice(0, 50).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className={
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-teal-50 " +
                    (c.id === customerId ? "bg-teal-50" : "")
                  }
                >
                  <span className="font-mono text-xs text-stone-500">{c.code}</span>
                  <span className="min-w-0 truncate text-stone-900">{c.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* 送货地址 — 按所选客户过滤，默认地址置顶/标注 */}
      <div>
        <Label>{t("pg.sales.orders.deliveryAddress")}</Label>
        <Select name="delivery_address_id" key={customerId} defaultValue="">
          <option value="">
            {t("pg.sales.orders.useDefaultAddress")}
            {defaultAddr ? ` · ${defaultAddr.address}` : ""}
          </option>
          {custAddresses.map((a) => (
            <option key={a.id} value={a.id}>
              {(a.label ?? t("pg.sales.orders.addressFallback")) +
                (a.is_default ? " ★" : "")}{" "}
              · {a.address}
            </option>
          ))}
        </Select>
      </div>

      {/* 要求送达日期 — 默认明天 */}
      <div>
        <Label>{t("pg.sales.orders.requestedDeliveryDate")}</Label>
        <Input
          name="requested_delivery_date"
          type="date"
          defaultValue={tomorrow}
          key={tomorrow}
        />
      </div>

      <div>
        <Label>{t("pg.sales.common.notes")}</Label>
        <Input name="notes" />
      </div>

      <div className="md:col-span-2">
        <Button type="submit" disabled={!customerId}>
          {t("pg.sales.orders.createOrder")}
        </Button>
      </div>
    </form>
  );
}
