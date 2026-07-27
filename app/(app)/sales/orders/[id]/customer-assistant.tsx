import { Card, CardBody } from "@/components/ui/card";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import {
  CustomerHistoryTabs,
  type HistoryItem,
} from "./customer-history-tabs";

type SlLine = {
  is_catch_weight_snapshot: boolean;
  shipped_units: number | string;
  shipped_weight_lb: number | string | null;
  unit_price: number | string;
};

function lineAmount(l: SlLine): number {
  const price = Number(l.unit_price);
  if (l.is_catch_weight_snapshot) {
    return Number(l.shipped_weight_lb ?? 0) * price;
  }
  return Number(l.shipped_units) * price;
}

export async function CustomerCreditPanel({
  customerId,
}: {
  customerId: string;
}) {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: exp }, { data: customer }, { data: payRows }, { data: soldRows }] =
    await Promise.all([
      supabase
        .from("v_credit_exposure")
        .select("credit_limit")
        .eq("customer_id", customerId)
        .maybeSingle(),
      supabase
        .from("customers")
        .select("name, code")
        .eq("id", customerId)
        .maybeSingle(),
      // 应收账龄/余额：按付款口径（未收余额）
      supabase
        .from("v_sl_payment")
        .select("signed_at, balance_amount")
        .eq("customer_id", customerId)
        .gt("balance_amount", 0),
      // 成交历史：已签收发运，按签收时间倒序
      supabase
        .from("shipping_lists")
        .select(
          "signed_at, sl_lines(product_id, is_catch_weight_snapshot, shipped_units, shipped_weight_lb, unit_price, products(sku, name))",
        )
        .eq("customer_id", customerId)
        .not("signed_at", "is", null)
        .order("signed_at", { ascending: false })
        .limit(300),
    ]);

  const nowDate = new Date();
  const curY = nowDate.getFullYear();
  const curM = nowDate.getMonth(); // 0-11

  // 聚合成交历史 + 最近销售日期 + 本月成交额
  type SoldLine = SlLine & {
    product_id: string;
    products:
      | { sku: string; name: string }
      | { sku: string; name: string }[]
      | null;
  };
  const agg = new Map<string, HistoryItem>();
  let lastSalesDate: string | null = null;
  let thisMonthTotal = 0;
  for (const row of soldRows ?? []) {
    const signedAt = (row as { signed_at: string | null }).signed_at;
    if (signedAt && (!lastSalesDate || signedAt > lastSalesDate)) {
      lastSalesDate = signedAt;
    }
    const inThisMonth = signedAt
      ? (() => {
          const d = new Date(signedAt);
          return d.getFullYear() === curY && d.getMonth() === curM;
        })()
      : false;
    for (const l of (row.sl_lines ?? []) as SoldLine[]) {
      if (inThisMonth) thisMonthTotal += lineAmount(l);
      const prod = Array.isArray(l.products) ? l.products[0] : l.products;
      if (!prod) continue;
      const price = Number(l.unit_price);
      const qty = Number(l.shipped_units);
      const existing = agg.get(l.product_id);
      if (!existing) {
        agg.set(l.product_id, {
          sku: prod.sku,
          name: prod.name,
          lastDate: signedAt,
          lastQty: qty,
          lastPrice: price,
          minPrice: price,
          maxPrice: price,
          count: 1,
          atp: 0,
        });
      } else {
        existing.minPrice = Math.min(existing.minPrice, price);
        existing.maxPrice = Math.max(existing.maxPrice, price);
        existing.count += 1;
      }
    }
  }

  const productIds = [...agg.keys()];
  if (productIds.length) {
    const { data: atpRows } = await supabase
      .from("v_atp")
      .select("product_id, atp_units")
      .in("product_id", productIds);
    for (const r of atpRows ?? []) {
      const item = agg.get(r.product_id);
      if (item) item.atp = Number(r.atp_units);
    }
  }
  const historyItems = [...agg.values()].sort((a, b) =>
    (b.lastDate ?? "").localeCompare(a.lastDate ?? ""),
  );

  const limit = Number(exp?.credit_limit ?? 0);
  const balance = (payRows ?? []).reduce(
    (s, r) => s + Number(r.balance_amount),
    0,
  );

  // 应收账龄按 signed_at 自然月归桶（当月 / 前3月 / 更早）
  const monthLabel = (offset: number) => {
    const d = new Date(curY, curM - offset, 1);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };
  const agingCols = [
    { key: "m0", label: monthLabel(0), amount: 0 },
    { key: "m1", label: monthLabel(1), amount: 0 },
    { key: "m2", label: monthLabel(2), amount: 0 },
    { key: "m3", label: monthLabel(3), amount: 0 },
    { key: "earlier", label: "Earlier", amount: 0 },
  ];
  for (const r of payRows ?? []) {
    const amount = Number(r.balance_amount);
    if (amount <= 0) continue;
    if (r.signed_at) {
      const d = new Date(r.signed_at);
      const diff = (curY - d.getFullYear()) * 12 + (curM - d.getMonth());
      const idx = diff <= 0 ? 0 : diff >= 4 ? 4 : diff;
      agingCols[idx].amount += amount;
    } else {
      agingCols[4].amount += amount;
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-2 text-sm">
          <div className="border-b border-stone-100 pb-2">
            <span className="text-stone-500">
              {t(messages, "pg.sales.assistant.customer")}
            </span>{" "}
            <span className="font-semibold text-stone-800">
              {customer?.name ?? customer?.code ?? "—"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-stone-500">
                {t(messages, "pg.sales.assistant.creditLimit")}
              </span>
              <span className="tabular-nums text-stone-800">
                {formatMoney(limit)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-stone-500">
                {t(messages, "pg.sales.assistant.balance")}
              </span>
              <span className="font-semibold tabular-nums text-stone-900">
                {formatMoney(balance)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-stone-500">
                {t(messages, "pg.sales.assistant.lastSales")}
              </span>
              <span className="tabular-nums text-stone-800">
                {lastSalesDate ? lastSalesDate.slice(0, 10) : "—"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-stone-500">
                {t(messages, "pg.sales.assistant.thisMonth")}
              </span>
              <span className="font-semibold tabular-nums text-stone-900">
                {formatMoney(thisMonthTotal)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-stone-100 pt-2">
            <table className="w-full text-center text-xs tabular-nums">
              <thead>
                <tr>
                  {agingCols.map((c, i) => (
                    <th key={c.key} className="px-1 py-0.5 font-semibold">
                      {i === 0 ? (
                        <span className="text-teal-700">{c.label}</span>
                      ) : c.key === "earlier" ? (
                        <span className="text-amber-700">{c.label}</span>
                      ) : (
                        <span className="text-stone-500">{c.label}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {agingCols.map((c) => (
                    <td
                      key={c.key}
                      className={
                        "px-1 py-0.5 " +
                        (c.key === "earlier" && c.amount > 0
                          ? "font-medium text-amber-700"
                          : "text-stone-600")
                      }
                    >
                      {c.amount === 0 ? "0.00" : formatMoney(c.amount)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <CustomerHistoryTabs items={historyItems} />
    </div>
  );
}
