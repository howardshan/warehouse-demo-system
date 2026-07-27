import Link from "next/link";
import { listAtp, listStock } from "@/app/actions/inventory";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";

export default async function StockPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const [stock, atp] = await Promise.all([listStock(), listAtp()]);
  const atpMap = new Map(atp.map((row) => [row.product_id, row]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {t(messages, "pg.inventory.stockTitle")}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {t(messages, "pg.inventory.stockDesc")}
          </p>
        </div>
        <Link
          href="/inventory/adj"
          className="rounded-md bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900"
        >
          {t(messages, "pg.inventory.adjTitle")}
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">{t(messages, "pg.inventory.colProduct")}</th>
              <th className="px-4 py-3">{t(messages, "pg.inventory.colLocation")}</th>
              <th className="px-4 py-3">{t(messages, "pg.inventory.colLotExpiry")}</th>
              <th className="px-4 py-3">{t(messages, "pg.inventory.colOnHandUnits")}</th>
              <th className="px-4 py-3">{t(messages, "pg.inventory.colOnHandWeight")}</th>
              <th className="px-4 py-3">{t(messages, "pg.inventory.colAllocatedUnits")}</th>
              <th className="px-4 py-3">{t(messages, "pg.inventory.colAtpUnits")}</th>
              <th className="px-4 py-3">{t(messages, "pg.inventory.colAtpWeight")}</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((row) => {
              const location = Array.isArray(row.locations)
                ? row.locations[0]
                : row.locations;
              const batch = Array.isArray(row.batches)
                ? row.batches[0]
                : row.batches;
              const product =
                batch &&
                (Array.isArray(batch.products)
                  ? batch.products[0]
                  : batch.products);
              const productAtp = product
                ? atpMap.get(product.id)
                : undefined;
              return (
                <tr key={row.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    {product?.name}
                    <div className="font-mono text-xs text-stone-400">
                      {product?.sku}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{location?.code}</span>{" "}
                    <Badge className="ml-1">{location?.type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{batch?.lot_no}</span>
                    <div className="text-xs text-stone-400">
                      {batch?.expiry_date ?? t(messages, "pg.inventory.noExpiry")}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.qty_units}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.qty_weight_lb} lb
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.allocated_units}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {productAtp?.atp_units ?? "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {productAtp?.atp_weight_lb ?? "—"}
                  </td>
                </tr>
              );
            })}
            {!stock.length && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-stone-400"
                >
                  {t(messages, "pg.inventory.emptyStock")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
