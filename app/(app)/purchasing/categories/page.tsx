import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  ProductCategoryCreateForm,
  ProductCategoryEditForm,
} from "./category-form";

export default async function ProductCategoriesPage() {
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
          <h1 className="text-2xl font-semibold">原产品分类</h1>
          <p className="mt-1 text-sm text-stone-500">
            维护分类（猪、牛、羊、鸡、鸭、甜品、蔬菜、酱料、米、面、打包耗材等），创建原产品时选择。
          </p>
        </div>
        <Link
          href="/purchasing/families/new"
          className="text-sm font-medium text-teal-800 hover:underline"
        >
          去新建原产品 →
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
                {cat.is_active ? "启用" : "停用"}
              </Badge>
            </div>
            <ProductCategoryEditForm category={cat} />
          </div>
        ))}
        {!categories?.length && (
          <p className="text-center text-stone-400">暂无分类</p>
        )}
      </div>
    </div>
  );
}
