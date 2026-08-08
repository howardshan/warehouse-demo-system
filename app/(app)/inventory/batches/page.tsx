import { listBatches } from "@/app/actions/inventory";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/utils";
import { BatchesBrowser, type BatchRow } from "./batches-browser";

function one<T>(v: unknown): T | null {
  const x = Array.isArray(v) ? v[0] : v;
  return (x ?? null) as T | null;
}

export default async function BatchesPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const batches = await listBatches();

  // 日期 / 金额在服务端格式化后再下发，避免客户端渲染时区导致 hydration 失配
  const rows: BatchRow[] = batches.map((batch) => {
    const product = one<{ sku: string; name: string }>(batch.products);
    return {
      id: batch.id,
      sku: product?.sku ?? "—",
      name: product?.name ?? "—",
      lot_no: batch.lot_no,
      origin: batch.origin,
      expiry: batch.expiry_date ?? "—",
      unitCost: formatMoney(Number(batch.unit_cost)),
      status: batch.status,
      receivedAt: batch.received_at
        ? new Date(batch.received_at).toLocaleString("zh-CN")
        : "—",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.inventory.batchesTitle")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.inventory.batchesDesc")}
        </p>
      </div>
      <BatchesBrowser batches={rows} />
    </div>
  );
}
