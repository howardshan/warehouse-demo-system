import Link from "next/link";
import { listAtp, listStock } from "@/app/actions/inventory";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { StockBrowser, type StockRow } from "./stock-browser";

function one<T>(v: unknown): T | null {
  const x = Array.isArray(v) ? v[0] : v;
  return (x ?? null) as T | null;
}

type Agg = StockRow & { locations: Set<string> };

export default async function StockPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const [stock, atp] = await Promise.all([listStock(), listAtp()]);
  const atpMap = new Map(atp.map((row) => [row.product_id, row]));

  // 按商品聚合：在手 / 占用求和、库位去重计数、温区取样，ATP 取商品级
  const map = new Map<string, Agg>();
  for (const row of stock) {
    const batch = one<{ products: unknown }>(row.batches);
    const product = one<{ id: string; sku: string; name: string }>(
      batch?.products,
    );
    if (!product) continue;
    const location = one<{ code: string; temp_zone: string }>(row.locations);
    const r =
      map.get(product.id) ??
      ({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        onHandUnits: 0,
        onHandWeight: 0,
        allocatedUnits: 0,
        locationCount: 0,
        tempZone: null,
        atpUnits: null,
        atpWeight: null,
        locations: new Set<string>(),
      } satisfies Agg);
    r.onHandUnits += Number(row.qty_units);
    r.onHandWeight += Number(row.qty_weight_lb);
    r.allocatedUnits += Number(row.allocated_units);
    if (location?.code) r.locations.add(location.code);
    if (!r.tempZone && location?.temp_zone) r.tempZone = location.temp_zone;
    map.set(product.id, r);
  }

  const rows: StockRow[] = [...map.values()]
    .map((r) => {
      const a = atpMap.get(r.productId);
      return {
        productId: r.productId,
        sku: r.sku,
        name: r.name,
        onHandUnits: r.onHandUnits,
        onHandWeight: r.onHandWeight,
        allocatedUnits: r.allocatedUnits,
        locationCount: r.locations.size,
        tempZone: r.tempZone,
        atpUnits: a ? Number(a.atp_units) : null,
        atpWeight: a ? Number(a.atp_weight_lb) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));

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

      <StockBrowser rows={rows} />
    </div>
  );
}
