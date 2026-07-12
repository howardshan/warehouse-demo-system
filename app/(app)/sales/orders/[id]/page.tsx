import Link from "next/link";
import { notFound } from "next/navigation";
import { addSoLine, confirmSalesOrder, deleteSoLine, requestMarginApproval, updateSoLine } from "@/app/actions/sales";
import { generatePickList } from "@/app/actions/warehouse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { calcMarginPct } from "@/lib/domain/margin";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: order }, { data: lines }, { data: products }, { data: approvals }] = await Promise.all([
    supabase.from("sales_orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("so_lines").select("*, products(code, name)").eq("sales_order_id", id).order("line_no"),
    supabase.from("products").select("id, code, name, current_price, is_catch_weight").eq("is_active", true).order("code"),
    supabase.from("so_approvals").select("*").eq("sales_order_id", id).order("requested_at", { ascending: false }),
  ]);
  if (!order) notFound();
  const unlocked = !order.locked_at;
  const total = (lines ?? []).reduce((sum, line) =>
    sum + Number(line.is_catch_weight_snapshot ? line.estimated_weight_lb : line.qty_units) * Number(line.unit_price), 0);

  return <div className="space-y-6">
    <div>
      <Link href="/sales/orders" className="text-sm text-teal-800 hover:underline">← 销售订单</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{order.so_number}</h1><Badge>{order.status}</Badge>
        {order.locked_at && <Badge tone="warn">商业字段已锁定</Badge>}
      </div>
      <p className="mt-1 text-sm text-stone-500">{order.customer_name_snapshot} · {order.delivery_address_snapshot}</p>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardBody><div className="text-xs text-stone-500">订单估算金额</div><div className="mt-1 text-xl font-semibold">{formatMoney(total)}</div></CardBody></Card>
      <Card><CardBody><div className="text-xs text-stone-500">信用额度快照</div><div className="mt-1 text-xl font-semibold">{formatMoney(Number(order.credit_limit_snapshot))}</div></CardBody></Card>
      <Card><CardBody><div className="text-xs text-stone-500">要求送达</div><div className="mt-1 text-xl font-semibold">{order.requested_delivery_date ?? "未指定"}</div></CardBody></Card>
    </div>

    {unlocked && <Card>
      <CardHeader><h2 className="font-semibold">添加商品行</h2></CardHeader>
      <CardBody><form action={addSoLine.bind(null, id)} className="grid gap-3 md:grid-cols-5">
        <div className="md:col-span-2"><Label>商品</Label><Select name="product_id" required defaultValue="">
          <option value="" disabled>请选择商品</option>{(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name} · {formatMoney(Number(p.current_price))}</option>)}
        </Select></div>
        <div><Label>件数</Label><Input name="qty_units" type="number" min="0.01" step="0.01" required /></div>
        <div><Label>预估重量(lb)</Label><Input name="estimated_weight_lb" type="number" min="0" step="0.01" /></div>
        <div><Label>覆盖单价(可选)</Label><Input name="unit_price" type="number" min="0" step="0.01" /></div>
        <div className="md:col-span-5"><Button type="submit">添加并重新校验</Button></div>
      </form></CardBody>
    </Card>}

    <Card>
      <CardHeader><h2 className="font-semibold">订单明细</h2></CardHeader>
      <CardBody className="space-y-3">
        {(lines ?? []).map((line) => {
          const product = line.products as unknown as { code: string; name: string };
          const margin = calcMarginPct(Number(line.unit_price), Number(line.cost_snapshot));
          return <form key={line.id} action={updateSoLine.bind(null, line.id, id)} className="grid items-end gap-3 rounded border border-stone-100 p-3 md:grid-cols-7">
            <div className="md:col-span-2"><div className="font-medium">{product.code} · {product.name}</div><div className="text-xs text-stone-500">成本快照 {formatMoney(Number(line.cost_snapshot))} · 毛利 {margin.toFixed(1)}% · 已分配 {line.allocated_units}</div></div>
            <div><Label>件数</Label><Input name="qty_units" type="number" step="0.01" defaultValue={line.qty_units} disabled={!unlocked} /></div>
            <div><Label>预估 lb</Label><Input name="estimated_weight_lb" type="number" step="0.01" defaultValue={line.estimated_weight_lb ?? ""} disabled={!unlocked || !line.is_catch_weight_snapshot} /></div>
            <div><Label>单价</Label><Input name="unit_price" type="number" step="0.01" defaultValue={line.unit_price} disabled={!unlocked} /></div>
            <div><Label>备注</Label><Input name="notes" defaultValue={line.notes ?? ""} disabled={!unlocked} /></div>
            <div className="flex gap-2">{unlocked && <><Button size="sm" type="submit">保存</Button><Button size="sm" variant="danger" formAction={deleteSoLine.bind(null, line.id, id)}>删除</Button></>}</div>
          </form>;
        })}
        {!lines?.length && <p className="text-sm text-stone-400">暂无商品行</p>}
      </CardBody>
    </Card>

    <div className="flex flex-wrap gap-3">
      {unlocked && !!lines?.length && <form action={confirmSalesOrder.bind(null, id)}><Button type="submit">确认并执行三重校验</Button></form>}
      {unlocked && !!lines?.length && <form action={requestMarginApproval.bind(null, id)} className="flex gap-2">
        <Select name="approval_type" defaultValue="margin"><option value="margin">低毛利审批</option><option value="below_cost">低于成本审批</option></Select>
        <Input name="reason" placeholder="审批原因" required /><Button type="submit" variant="secondary">申请审批</Button>
      </form>}
      {order.status === "confirmed" && <form action={generatePickList.bind(null, id)}><Button type="submit" variant="secondary">生成拣货单并锁单</Button></form>}
    </div>

    {!!approvals?.length && <Card><CardHeader><h2 className="font-semibold">审批记录</h2></CardHeader><CardBody className="space-y-2 text-sm">
      {approvals.map((item) => <div key={item.id} className="flex justify-between border-b border-stone-100 py-2"><span>{item.approval_type} · {item.reason}</span><Badge>{item.status}</Badge></div>)}
    </CardBody></Card>}
  </div>;
}
