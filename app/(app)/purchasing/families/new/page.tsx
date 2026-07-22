import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductFamilyCreateForm } from "../family-form";

export default async function NewProductFamilyPage() {
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
          <h1 className="text-2xl font-semibold">新建原产品</h1>
          <p className="mt-1 text-sm text-stone-500">
            指定供应商、分类、采购单位；需要称重时勾选。创建后到「原产品查询」编辑。
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
            href="/purchasing/families"
            className="font-medium text-teal-800 hover:underline"
          >
            去查询 / 编辑 →
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
