import { addRepackOutput, completeRepack, createRepackOrder } from "@/app/actions/repack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";

export default async function RepackPage() {
  const supabase = await createClient();
  const [{ data: orders }, { data: stocks }, { data: products }, { data: locations }] = await Promise.all([
    supabase.from("repack_orders")
      .select("id, repack_number, status, input_qty_units, input_weight_lb, scheduled_date, batches(lot_no, products(sku, name)), locations(code), repack_outputs(id, line_no, lot_no, qty_units, weight_lb, output_batch_id, products(sku, name))")
      .order("created_at", { ascending: false }),
    supabase.from("stock").select("batch_id, location_id, qty_units, qty_weight_lb, batches!inner(lot_no, status, products(sku, name)), locations!inner(code)")
      .eq("batches.status", "available").or("qty_units.gt.0,qty_weight_lb.gt.0"),
    supabase.from("products").select("id, sku, name").eq("is_active", true).order("sku"),
    supabase.from("locations").select("id, code, type").eq("is_active", true)
      .in("type", ["pick_face", "reserve", "overflow"]).order("code"),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">重包工单</h1><p className="mt-1 text-sm text-stone-500">投入与产出均保留双单位；完成后产出新子批次。</p></div>
    <Card><CardHeader><h2 className="font-semibold">新建重包工单</h2></CardHeader><CardBody><form action={createRepackOrder} className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      <Select name="input_source" required defaultValue="" className="md:col-span-2"><option value="" disabled>选择来源批次与储位</option>{(stocks ?? []).map((stock) => {
        const batch = Array.isArray(stock.batches) ? stock.batches[0] : stock.batches;
        const product = batch && (Array.isArray(batch.products) ? batch.products[0] : batch.products);
        const location = Array.isArray(stock.locations) ? stock.locations[0] : stock.locations;
        return <option key={`${stock.batch_id}-${stock.location_id}`} value={`${stock.batch_id}|${stock.location_id}`}>{product?.sku} · {product?.name} · {batch?.lot_no} · {location?.code} · {stock.qty_units} 件 / {stock.qty_weight_lb} lb</option>;
      })}</Select>
      <Input name="input_qty_units" type="number" min="0" step="0.001" defaultValue="0" placeholder="投入件数" />
      <Input name="input_weight_lb" type="number" min="0" step="0.001" defaultValue="0" placeholder="投入实重 lb" />
      <Input name="scheduled_date" type="date" />
      <Input name="notes" placeholder="备注" />
      <Button type="submit" className="md:col-span-3 xl:col-span-4">创建工单</Button>
    </form></CardBody></Card>
    <div className="space-y-4">{(orders ?? []).map((order) => {
      const batch = Array.isArray(order.batches) ? order.batches[0] : order.batches;
      const product = batch && (Array.isArray(batch.products) ? batch.products[0] : batch.products);
      const location = Array.isArray(order.locations) ? order.locations[0] : order.locations;
      const editable = order.status !== "completed" && order.status !== "cancelled";
      return <Card key={order.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-mono font-semibold">{order.repack_number}</h2><p className="text-sm text-stone-500">{product?.sku} · {product?.name} · {batch?.lot_no} · {location?.code} · 投入 {order.input_qty_units} 件 / {order.input_weight_lb} lb</p></div><Badge tone={order.status === "completed" ? "ok" : "warn"}>{order.status}</Badge></div></CardHeader><CardBody>
        <div className="mb-4 space-y-2">{(order.repack_outputs ?? []).map((output) => {
          const outputProduct = Array.isArray(output.products) ? output.products[0] : output.products;
          return <div key={output.id} className="flex justify-between border-b border-stone-100 pb-2 text-sm"><span>#{output.line_no} {outputProduct?.sku} · {outputProduct?.name} · {output.lot_no}</span><span>{output.qty_units} 件 / {output.weight_lb} lb {output.output_batch_id ? "· 已生成批次" : ""}</span></div>;
        })}{!order.repack_outputs?.length && <p className="text-sm text-stone-400">尚无产出行</p>}</div>
        {editable && <form action={addRepackOutput.bind(null, order.id)} className="grid gap-2 md:grid-cols-3 xl:grid-cols-4"><Select name="product_id" required defaultValue=""><option value="" disabled>产出商品</option>{(products ?? []).map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)}</Select><Select name="target_location_id" required defaultValue=""><option value="" disabled>目标储位</option>{(locations ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.type}</option>)}</Select><Input name="lot_no" required placeholder="产出批号" /><Input name="expiry_date" type="date" /><Input name="qty_units" type="number" min="0" step="0.001" defaultValue="0" placeholder="产出件数" /><Input name="weight_lb" type="number" min="0" step="0.001" defaultValue="0" placeholder="产出实重 lb" /><Input name="unit_cost" type="number" min="0" step="0.0001" placeholder="单位成本（留空继承）" /><Button type="submit" variant="secondary">添加产出</Button></form>}
        {editable && !!order.repack_outputs?.length && <form action={completeRepack.bind(null, order.id)} className="mt-3 text-right"><Button type="submit">完成并生成批次</Button></form>}
      </CardBody></Card>;
    })}</div>
  </div>;
}
