import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: locations }, { data: families }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, sku, name, temp_zone, is_catch_weight, ordering_uom, pricing_uom, avg_weight_lb, current_price, is_active, fixed_pick_location_id, pack_contains_qty, family_id, inspection_method, shelf_life_days",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.from("locations").select("id, code, type").eq("is_active", true),
      supabase
        .from("product_families")
        .select("id, code, name")
        .eq("is_active", true)
        .order("name"),
    ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/master-data/products"
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← 返回商品列表
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">编辑商品</h1>
        <p className="mt-1 text-sm text-stone-500">
          {product.sku} · {product.name}
        </p>
      </div>
      <ProductForm
        mode="edit"
        locations={locations ?? []}
        families={families ?? []}
        initial={{
          id: product.id,
          sku: product.sku,
          name: product.name,
          temp_zone: product.temp_zone,
          is_catch_weight: product.is_catch_weight,
          ordering_uom: product.ordering_uom,
          pricing_uom: product.pricing_uom,
          avg_weight_lb: product.avg_weight_lb
            ? Number(product.avg_weight_lb)
            : null,
          current_price: Number(product.current_price),
          inspection_method: product.inspection_method,
          fixed_pick_location_id: product.fixed_pick_location_id,
          shelf_life_days: product.shelf_life_days,
          is_active: product.is_active,
          family_id: product.family_id,
          pack_contains_qty: Number(product.pack_contains_qty ?? 1),
        }}
      />
    </div>
  );
}
