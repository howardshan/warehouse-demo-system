import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function SalesHistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; batch?: string }> }) {
  const { q = "", batch = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("sl_lines").select(
    "id, unit_price, shipped_units, shipped_weight_lb, created_at, products(code, name), batches(lot_no), shipping_lists!inner(sl_number, status, signed_at, sales_order_id, sales_orders!inner(so_number, customer_name_snapshot))",
  ).eq("shipping_lists.status", "signed").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`, { referencedTable: "products" });
  if (batch) query = query.ilike("batches.lot_no", `%${batch}%`);
  const { data: rows } = await query;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">销售历史</h1><p className="mt-1 text-sm text-stone-500">历史成交价读取发运行快照，不受商品主档后续调价影响。</p></div><Link href="/sales/history/trace" className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm text-teal-800 hover:bg-stone-50">批次全链路追溯</Link></div>
    <Card><CardHeader><h2 className="font-semibold">商品 / 批次追溯</h2></CardHeader><CardBody>
      <form className="flex flex-wrap gap-3"><Input name="q" defaultValue={q} placeholder="商品编码或名称" className="max-w-xs" /><Input name="batch" defaultValue={batch} placeholder="批号" className="max-w-xs" /><Button type="submit">查询</Button></form>
    </CardBody></Card>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">签收日期</th><th className="px-4 py-3">订单 / 发运</th><th className="px-4 py-3">客户</th><th className="px-4 py-3">商品</th><th className="px-4 py-3">批号</th><th className="px-4 py-3">历史单价</th><th className="px-4 py-3">实发</th></tr></thead>
      <tbody>{(rows ?? []).map((row) => {
        const product = row.products as unknown as { code: string; name: string };
        const lot = row.batches as unknown as { lot_no: string };
        const shipping = row.shipping_lists as unknown as { sl_number: string; signed_at: string; sales_order_id: string; sales_orders: { so_number: string; customer_name_snapshot: string } };
        return <tr key={row.id} className="border-t border-stone-100"><td className="px-4 py-3">{shipping.signed_at?.slice(0, 10)}</td><td className="px-4 py-3"><Link href={`/sales/orders/${shipping.sales_order_id}`} className="text-teal-800 hover:underline">{shipping.sales_orders.so_number}</Link> / {shipping.sl_number}</td><td className="px-4 py-3">{shipping.sales_orders.customer_name_snapshot}</td><td className="px-4 py-3">{product.code} · {product.name}</td><td className="px-4 py-3 font-mono">{lot.lot_no}</td><td className="px-4 py-3 tabular-nums">{formatMoney(Number(row.unit_price))}</td><td className="px-4 py-3">{row.shipped_units} 件{row.shipped_weight_lb != null ? ` / ${row.shipped_weight_lb} lb` : ""}</td></tr>;
      })}</tbody>
    </table></div>
  </div>;
}
