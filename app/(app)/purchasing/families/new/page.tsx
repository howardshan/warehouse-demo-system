import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { ProductFamilyCreateForm } from "../family-form";

export default async function NewProductFamilyPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: suppliers }, { data: categories }] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t(messages, "pg.purchasing.newFamily")}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {t(messages, "pg.purchasing.newFamilyDesc")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/purchasing/categories"
            className="font-medium text-teal-800 hover:underline"
          >
            {t(messages, "pg.purchasing.editCategoryLink")}
          </Link>
          <Link
            href="/purchasing/families"
            className="font-medium text-teal-800 hover:underline"
          >
            {t(messages, "pg.purchasing.goQueryEdit")}
          </Link>
        </div>
      </div>

      <ProductFamilyCreateForm
        suppliers={(suppliers ?? []).map((s) => ({ id: s.id, name: s.name }))}
        categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
