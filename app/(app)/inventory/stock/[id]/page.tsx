import Link from "next/link";
import { notFound } from "next/navigation";
import { listAtp, listStock } from "@/app/actions/inventory";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";

function one<T>(v: unknown): T | null {
  const x = Array.isArray(v) ? v[0] : v;
  return (x ?? null) as T | null;
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: product }, stock, atp] = await Promise.all([
    supabase.from("products").select("id, sku, name").eq("id", id).maybeSingle(),
    listStock(),
    listAtp(),
  ]);
  if (!product) notFound();

  const rows = stock.filter((row) => {
    const batch = one<{ products: unknown }>(row.batches);
    const p = one<{ id: string }>(batch?.products);
    return p?.id === id;
  });
  const atpRow = atp.find((a) => a.product_id === id);

  const summary = [
    {
      label: t(messages, "pg.inventory.colOnHandUnits"),
      value: atpRow ? String(atpRow.on_hand_units) : "—",
    },
    {
      label: t(messages, "pg.inventory.colAllocatedUnits"),
      value: atpRow ? String(atpRow.allocated_units) : "—",
    },
    {
      label: t(messages, "pg.inventory.colAtpUnits"),
      value: atpRow ? String(atpRow.atp_units) : "—",
    },
    {
      label: t(messages, "pg.inventory.colAtpWeight"),
      value:
        atpRow && Number(atpRow.atp_weight_lb) > 0
          ? `${atpRow.atp_weight_lb} lb`
          : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/inventory/stock"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
        >
          <span aria-hidden>←</span>
          {t(messages, "pg.inventory.backToStock")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
        <p className="mt-1 text-sm text-stone-500">
          <span className="font-mono">{product.sku}</span> ·{" "}
          {t(messages, "pg.inventory.stockDetailIntro")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-stone-200 bg-white px-4 py-3"
          >
            <div className="text-xs text-stone-500">{s.label}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {t(messages, "pg.inventory.colLocation")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t(messages, "pg.inventory.colLotExpiry")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t(messages, "pg.inventory.colBatchStatus")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t(messages, "pg.inventory.colOnHandUnits")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t(messages, "pg.inventory.colOnHandWeight")}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t(messages, "pg.inventory.colAllocatedUnits")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const location = one<{ code: string; type: string }>(
                  row.locations,
                );
                const batch = one<{
                  lot_no: string;
                  expiry_date: string | null;
                  status: string;
                }>(row.batches);
                const onHandWeight = Number(row.qty_weight_lb);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-stone-100 last:border-0 even:bg-stone-50/40"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">
                        {location?.code}
                      </span>{" "}
                      <Badge className="ml-1">{location?.type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{batch?.lot_no}</span>
                      <div className="text-xs text-stone-400">
                        {batch?.expiry_date ??
                          t(messages, "pg.inventory.noExpiry")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{batch?.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.qty_units}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {onHandWeight > 0 ? `${row.qty_weight_lb} lb` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.allocated_units}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-stone-400"
                  >
                    {t(messages, "pg.inventory.stockDetailEmpty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
