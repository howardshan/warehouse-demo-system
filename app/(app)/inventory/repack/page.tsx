import { addRepackOutput, completeRepack, createRepackOrder } from "@/app/actions/repack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function RepackPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
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
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.inventory.repackTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.inventory.repackDesc")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.inventory.newRepackTitle")}</h2></CardHeader><CardBody><form action={createRepackOrder} className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      <Select name="input_source" required defaultValue="" className="md:col-span-2"><option value="" disabled>{t(messages, "pg.inventory.selectSourcePlaceholder")}</option>{(stocks ?? []).map((stock) => {
        const batch = Array.isArray(stock.batches) ? stock.batches[0] : stock.batches;
        const product = batch && (Array.isArray(batch.products) ? batch.products[0] : batch.products);
        const location = Array.isArray(stock.locations) ? stock.locations[0] : stock.locations;
        return <option key={`${stock.batch_id}-${stock.location_id}`} value={`${stock.batch_id}|${stock.location_id}`}>{product?.sku} · {product?.name} · {batch?.lot_no} · {location?.code} · {t(messages, "pg.inventory.unitsWeightLb").replace("{u}", String(stock.qty_units)).replace("{w}", String(stock.qty_weight_lb))}</option>;
      })}</Select>
      <Input name="input_qty_units" type="number" min="0" step="0.001" defaultValue="0" placeholder={t(messages, "pg.inventory.inputUnitsPlaceholder")} />
      <Input name="input_weight_lb" type="number" min="0" step="0.001" defaultValue="0" placeholder={t(messages, "pg.inventory.inputWeightPlaceholder")} />
      <Input name="scheduled_date" type="date" />
      <Input name="notes" placeholder={t(messages, "pg.inventory.notes")} />
      <Button type="submit" className="md:col-span-3 xl:col-span-4">{t(messages, "pg.inventory.createRepackOrder")}</Button>
    </form></CardBody></Card>
    <div className="space-y-4">{(orders ?? []).map((order) => {
      const batch = Array.isArray(order.batches) ? order.batches[0] : order.batches;
      const product = batch && (Array.isArray(batch.products) ? batch.products[0] : batch.products);
      const location = Array.isArray(order.locations) ? order.locations[0] : order.locations;
      const editable = order.status !== "completed" && order.status !== "cancelled";
      return <Card key={order.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-mono font-semibold">{order.repack_number}</h2><p className="text-sm text-stone-500">{product?.sku} · {product?.name} · {batch?.lot_no} · {location?.code} · {t(messages, "pg.inventory.inputUnitsWeight").replace("{u}", String(order.input_qty_units)).replace("{w}", String(order.input_weight_lb))}</p></div><Badge tone={order.status === "completed" ? "ok" : "warn"}>{order.status}</Badge></div></CardHeader><CardBody>
        <div className="mb-4 space-y-2">{(order.repack_outputs ?? []).map((output) => {
          const outputProduct = Array.isArray(output.products) ? output.products[0] : output.products;
          return <div key={output.id} className="flex justify-between border-b border-stone-100 pb-2 text-sm"><span>#{output.line_no} {outputProduct?.sku} · {outputProduct?.name} · {output.lot_no}</span><span>{t(messages, "pg.inventory.unitsWeightLb").replace("{u}", String(output.qty_units)).replace("{w}", String(output.weight_lb))} {output.output_batch_id ? t(messages, "pg.inventory.batchGenerated") : ""}</span></div>;
        })}{!order.repack_outputs?.length && <p className="text-sm text-stone-400">{t(messages, "pg.inventory.noOutputs")}</p>}</div>
        {editable && <form action={addRepackOutput.bind(null, order.id)} className="grid gap-2 md:grid-cols-3 xl:grid-cols-4"><Select name="product_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.inventory.outputProduct")}</option>{(products ?? []).map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)}</Select><Select name="target_location_id" required defaultValue=""><option value="" disabled>{t(messages, "pg.inventory.targetLocation")}</option>{(locations ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.type}</option>)}</Select><Input name="lot_no" required placeholder={t(messages, "pg.inventory.outputLotPlaceholder")} /><Input name="expiry_date" type="date" /><Input name="qty_units" type="number" min="0" step="0.001" defaultValue="0" placeholder={t(messages, "pg.inventory.outputUnitsPlaceholder")} /><Input name="weight_lb" type="number" min="0" step="0.001" defaultValue="0" placeholder={t(messages, "pg.inventory.outputWeightPlaceholder")} /><Input name="unit_cost" type="number" min="0" step="0.0001" placeholder={t(messages, "pg.inventory.unitCostPlaceholder")} /><Button type="submit" variant="secondary">{t(messages, "pg.inventory.addOutput")}</Button></form>}
        {editable && !!order.repack_outputs?.length && <form action={completeRepack.bind(null, order.id)} className="mt-3 text-right"><Button type="submit">{t(messages, "pg.inventory.completeGenerate")}</Button></form>}
      </CardBody></Card>;
    })}</div>
  </div>;
}
