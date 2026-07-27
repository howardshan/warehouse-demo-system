import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductCreateForm } from "./product-form";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function ProductsPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: products }, { data: locations }, { data: families }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, sku, name, temp_zone, is_catch_weight, ordering_uom, pricing_uom, avg_weight_lb, current_price, is_active, fixed_pick_location_id, pack_contains_qty, family_id, is_purchasable, is_sellable, requires_debox, product_families(code, name, purchase_uom, outer_pack_weight_lb, suppliers(name))",
        )
        .order("sku"),
      supabase.from("locations").select("id, code, type").eq("is_active", true),
      supabase
        .from("product_families")
        .select(
          "id, code, name, purchase_uom, outer_pack_weight_lb, is_catch_weight, suppliers(name)",
        )
        .eq("is_active", true)
        .order("name"),
    ]);

  const locMap = new Map((locations ?? []).map((l) => [l.id, l.code]));
  const familyOptions = (families ?? []).map((f) => {
    const supplier = Array.isArray(f.suppliers) ? f.suppliers[0] : f.suppliers;
    return {
      id: f.id,
      code: f.code,
      name: f.name,
      purchase_uom: f.purchase_uom,
      outer_pack_weight_lb:
        f.outer_pack_weight_lb == null ? null : Number(f.outer_pack_weight_lb),
      supplier_name: supplier?.name ?? null,
      is_catch_weight: Boolean(f.is_catch_weight),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.masterData.products.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.masterData.products.intro")}{" "}
          <Link
            href="/purchasing/families/new"
            className="font-medium text-teal-800 hover:underline"
          >
            {t(messages, "pg.masterData.products.newFamilyLink")}
          </Link>{" "}
          ·{" "}
          <Link
            href="/purchasing/families"
            className="font-medium text-teal-800 hover:underline"
          >
            {t(messages, "pg.masterData.products.familyQueryLink")}
          </Link>
        </p>
      </div>

      <ProductCreateForm
        locations={locations ?? []}
        families={familyOptions}
      />

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.products.familyHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.products.saleNameHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.products.orderUomHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.products.usageHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.products.conversionHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.products.priceHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.products.pickLocationHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.common.status")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.products.actionsHeader")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => {
              const family = Array.isArray(p.product_families)
                ? p.product_families[0]
                : p.product_families;
              const famSupplier = family
                ? Array.isArray(family.suppliers)
                  ? family.suppliers[0]
                  : family.suppliers
                : null;
              return (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-sm">
                    {family ? family.name : "—"}
                    {family?.code && (
                      <div className="font-mono text-xs text-stone-400">
                        {family.code}
                      </div>
                    )}
                    {famSupplier?.name && (
                      <div className="text-xs text-stone-500">
                        {famSupplier.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.name}
                    {p.is_catch_weight && (
                      <Badge className="ml-2" tone="ok">
                        catch wt
                      </Badge>
                    )}
                    {p.requires_debox && (
                      <Badge className="ml-2" tone="neutral">
                        {t(messages, "pg.masterData.products.deboxBadge")}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.ordering_uom}
                    {p.pricing_uom !== p.ordering_uom
                      ? ` → ${p.pricing_uom}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.is_purchasable
                      ? t(messages, "pg.masterData.products.usagePurchase")
                      : p.is_sellable
                        ? t(messages, "pg.masterData.products.usageSell")
                        : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs">
                    {p.family_id && Number(p.pack_contains_qty) > 0
                      ? `1 ${
                          (family as { purchase_uom?: string | null } | null)
                            ?.purchase_uom ??
                          t(messages, "pg.masterData.common.purchaseUomFallback")
                        } = ${p.pack_contains_qty} ${p.ordering_uom}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(Number(p.current_price))}/{p.pricing_uom}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {p.fixed_pick_location_id
                      ? (locMap.get(p.fixed_pick_location_id) ?? "—")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.is_active ? "ok" : "neutral"}>
                      {p.is_active
                        ? t(messages, "pg.masterData.common.onShelf")
                        : t(messages, "pg.masterData.common.offShelf")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/master-data/products/${p.id}`}
                      className="text-sm font-medium text-teal-800 hover:underline"
                    >
                      {t(messages, "pg.masterData.products.edit")}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(products ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-stone-400"
                >
                  {t(messages, "pg.masterData.products.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
