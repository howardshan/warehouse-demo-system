import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ProductFamilyEditForm } from "./family-form";

export default async function ProductFamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; supplier?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const supplierFilter = sp.supplier ?? "";
  const categoryFilter = sp.category ?? "";

  const supabase = await createClient();
  let familyQuery = supabase
    .from("product_families")
    .select(
      "id, code, name, notes, is_active, purchase_uom, outer_pack_weight_lb, is_catch_weight, supplier_id, category_id, created_at, suppliers(name), product_categories(name)",
    )
    .order("code");

  if (supplierFilter) {
    familyQuery = familyQuery.eq("supplier_id", supplierFilter);
  }
  if (categoryFilter) {
    familyQuery = familyQuery.eq("category_id", categoryFilter);
  }
  if (q) {
    familyQuery = familyQuery.or(`code.ilike.%${q}%,name.ilike.%${q}%`);
  }

  const [
    { data: families },
    { data: products },
    { data: suppliers },
    { data: categories },
  ] = await Promise.all([
    familyQuery,
    supabase
      .from("products")
      .select(
        "id, sku, name, ordering_uom, family_id, is_active, is_purchasable, is_sellable, pack_contains_qty, requires_debox",
      )
      .not("family_id", "is", null)
      .order("sku"),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("product_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
  ]);

  const supplierOptions = (suppliers ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));
  const categoryOptions = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const skuByFamily = new Map<string, typeof products>();
  for (const p of products ?? []) {
    if (!p.family_id) continue;
    const list = skuByFamily.get(p.family_id) ?? [];
    list.push(p);
    skuByFamily.set(p.family_id, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">原产品查询</h1>
          <p className="mt-1 text-sm text-stone-500">
            按编码、名称、供应商或分类查找并编辑原产品。
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/purchasing/categories"
            className="font-medium text-teal-800 hover:underline"
          >
            编辑分类 →
          </Link>
          <Link
            href="/purchasing/families/new"
            className="font-medium text-teal-800 hover:underline"
          >
            新建原产品 →
          </Link>
          <Link
            href="/master-data/products"
            className="font-medium text-teal-800 hover:underline"
          >
            管理包装 SKU →
          </Link>
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-4"
        method="get"
      >
        <div className="min-w-[10rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-stone-500">
            编码 / 名称
          </label>
          <input
            name="q"
            defaultValue={q}
            placeholder="搜索…"
            className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm"
          />
        </div>
        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-stone-500">
            供应商
          </label>
          <select
            name="supplier"
            defaultValue={supplierFilter}
            className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm"
          >
            <option value="">全部供应商</option>
            {supplierOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[8rem]">
          <label className="mb-1 block text-xs font-medium text-stone-500">
            分类
          </label>
          <select
            name="category"
            defaultValue={categoryFilter}
            className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm"
          >
            <option value="">全部分类</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-md bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900"
        >
          查询
        </button>
        {(q || supplierFilter || categoryFilter) && (
          <Link
            href="/purchasing/families"
            className="h-10 content-center text-sm text-stone-500 hover:text-stone-800"
          >
            清除
          </Link>
        )}
      </form>

      <div className="space-y-4">
        {(families ?? []).map((family) => {
          const skus = skuByFamily.get(family.id) ?? [];
          const supplier = Array.isArray(family.suppliers)
            ? family.suppliers[0]
            : family.suppliers;
          const category = Array.isArray(family.product_categories)
            ? family.product_categories[0]
            : family.product_categories;
          return (
            <div
              key={family.id}
              className="rounded-lg border border-stone-200 bg-white p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{family.name}</span>
                <span className="font-mono text-xs text-stone-500">
                  {family.code}
                </span>
                <Badge>{category?.name ?? "未分类"}</Badge>
                <Badge>{supplier?.name ?? "未指定供应商"}</Badge>
                {family.is_catch_weight && <Badge>称重</Badge>}
                {family.purchase_uom && (
                  <Badge>采购单位 {family.purchase_uom}</Badge>
                )}
                {family.outer_pack_weight_lb != null &&
                  Number(family.outer_pack_weight_lb) > 0 && (
                    <Badge>
                      外包装 {Number(family.outer_pack_weight_lb)} lb
                    </Badge>
                  )}
                <Badge tone={family.is_active ? "ok" : "neutral"}>
                  {family.is_active ? "启用" : "停用"}
                </Badge>
              </div>
              <ProductFamilyEditForm
                family={family}
                suppliers={supplierOptions}
                categories={categoryOptions}
              />
              <div className="mt-3 border-t border-stone-100 pt-3 text-sm">
                <div className="mb-1 text-xs font-medium text-stone-500">
                  已挂包装 SKU（{skus.length}）
                </div>
                {skus.length === 0 ? (
                  <p className="text-stone-400">
                    暂无 SKU。请到{" "}
                    <Link
                      href="/master-data/products"
                      className="text-teal-800 hover:underline"
                    >
                      商品
                    </Link>{" "}
                    页新建并归属本原产品。
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {skus.map((p) => (
                      <li key={p.id} className="flex flex-wrap gap-2">
                        <Link
                          href={`/master-data/products/${p.id}`}
                          className="font-mono text-xs text-teal-800 hover:underline"
                        >
                          {p.sku}
                        </Link>
                        <span>{p.name}</span>
                        <span className="text-stone-400">{p.ordering_uom}</span>
                        <span className="text-xs text-stone-500">
                          {p.is_purchasable
                            ? "采购"
                            : p.is_sellable
                              ? "销售"
                              : "—"}
                          {Number(p.pack_contains_qty) > 0
                            ? ` · 1:${p.pack_contains_qty}`
                            : ""}
                          {p.requires_debox ? " · 去盒" : ""}
                        </span>
                        {!p.is_active && (
                          <Badge tone="neutral">下架</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
        {!families?.length && (
          <p className="text-center text-stone-400">
            暂无匹配的原产品。
            <Link
              href="/purchasing/families/new"
              className="ml-1 text-teal-800 hover:underline"
            >
              去新建
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
