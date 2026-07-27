import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { Badge } from "@/components/ui/badge";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import {
  ProductCategoryCreateForm,
  ProductCategoryEditForm,
} from "./category-form";

export default async function ProductCategoriesPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("product_categories")
    .select("id, code, name, sort_order, is_active, created_at")
    .order("sort_order")
    .order("code");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t(messages, "pg.purchasing.productCategories")}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {t(messages, "pg.purchasing.productCategoriesDesc")}
          </p>
        </div>
        <Link
          href="/purchasing/families/new"
          className="text-sm font-medium text-teal-800 hover:underline"
        >
          {t(messages, "pg.purchasing.goCreateFamily")}
        </Link>
      </div>

      <ProductCategoryCreateForm />

      <div className="space-y-3">
        {(categories ?? []).map((cat) => (
          <div
            key={cat.id}
            className="rounded-lg border border-stone-200 bg-white p-4"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-semibold">{cat.name}</span>
              <span className="font-mono text-xs text-stone-500">{cat.code}</span>
              <Badge tone={cat.is_active ? "ok" : "neutral"}>
                {cat.is_active ? t(messages, "pg.purchasing.enabled") : t(messages, "pg.purchasing.disabled")}
              </Badge>
            </div>
            <ProductCategoryEditForm category={cat} />
          </div>
        ))}
        {!categories?.length && (
          <p className="text-center text-stone-400">{t(messages, "pg.purchasing.noCategories")}</p>
        )}
      </div>
    </div>
  );
}
