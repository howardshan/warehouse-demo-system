import Link from "next/link";
import { notFound } from "next/navigation";
import { requestMarginApproval } from "@/app/actions/sales";
import { generatePickList } from "@/app/actions/warehouse";
import {
  AddSoLineForm,
  ConfirmSoButton,
  SoLineEditor,
} from "../so-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { calcMarginPct } from "@/lib/domain/margin";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [
    { data: order },
    { data: lines },
    { data: products },
    { data: approvals },
    { data: atpRows },
  ] = await Promise.all([
    supabase.from("sales_orders").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("so_lines")
      .select("*, products(sku, name)")
      .eq("sales_order_id", id)
      .order("line_no"),
    supabase
      .from("products")
      .select("id, sku, name, current_price, is_catch_weight")
      .eq("is_active", true)
      .order("sku"),
    supabase
      .from("so_approvals")
      .select("*")
      .eq("sales_order_id", id)
      .order("requested_at", { ascending: false }),
    supabase.from("v_atp").select("product_id, atp_units"),
  ]);
  if (!order) notFound();

  const atpMap = new Map(
    (atpRows ?? []).map((r) => [r.product_id, Number(r.atp_units)]),
  );
  const unlocked = !order.locked_at;
  const total = (lines ?? []).reduce(
    (sum, line) =>
      sum +
      Number(
        line.is_catch_weight_snapshot
          ? line.estimated_weight_lb
          : line.qty_units,
      ) *
        Number(line.unit_price),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sales/orders"
          className="text-sm text-teal-800 hover:underline"
        >
          ← 销售订单
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{order.so_number}</h1>
          <Badge>{order.status}</Badge>
          {order.locked_at && <Badge tone="warn">商业字段已锁定</Badge>}
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {order.customer_name_snapshot} · {order.delivery_address_snapshot}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody>
            <div className="text-xs text-stone-500">订单估算金额</div>
            <div className="mt-1 text-xl font-semibold">{formatMoney(total)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs text-stone-500">信用额度快照</div>
            <div className="mt-1 text-xl font-semibold">
              {formatMoney(Number(order.credit_limit_snapshot))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-xs text-stone-500">要求送达</div>
            <div className="mt-1 text-xl font-semibold">
              {order.requested_delivery_date ?? "未指定"}
            </div>
          </CardBody>
        </Card>
      </div>

      {unlocked && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">添加商品行</h2>
            <p className="text-sm text-stone-500">
              件数不得超过可用库存（ATP）。提交订单时会再次全单校验。
            </p>
          </CardHeader>
          <CardBody>
            <AddSoLineForm
              salesOrderId={id}
              products={(products ?? []).map((p) => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                current_price: Number(p.current_price),
                is_catch_weight: p.is_catch_weight,
                atp_units: atpMap.get(p.id) ?? 0,
              }))}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold">订单明细</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {(lines ?? []).map((line) => {
            const product = Array.isArray(line.products)
              ? line.products[0]
              : line.products;
            const margin = calcMarginPct(
              Number(line.unit_price),
              Number(line.cost_snapshot),
            );
            return (
              <SoLineEditor
                key={line.id}
                salesOrderId={id}
                unlocked={unlocked}
                marginPct={margin}
                line={{
                  id: line.id,
                  qty_units: Number(line.qty_units),
                  estimated_weight_lb:
                    line.estimated_weight_lb == null
                      ? null
                      : Number(line.estimated_weight_lb),
                  unit_price: Number(line.unit_price),
                  cost_snapshot: Number(line.cost_snapshot),
                  allocated_units: Number(line.allocated_units),
                  is_catch_weight_snapshot: line.is_catch_weight_snapshot,
                  notes: line.notes,
                  products: product
                    ? { sku: product.sku, name: product.name }
                    : null,
                }}
              />
            );
          })}
          {!lines?.length && (
            <p className="text-sm text-stone-400">暂无商品行</p>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3">
        {unlocked && !!lines?.length && <ConfirmSoButton salesOrderId={id} />}
        {unlocked && !!lines?.length && (
          <form
            action={requestMarginApproval.bind(null, id)}
            className="flex gap-2"
          >
            <Select name="approval_type" defaultValue="margin">
              <option value="margin">低毛利审批</option>
              <option value="below_cost">低于成本审批</option>
            </Select>
            <Input name="reason" placeholder="审批原因" required />
            <Button type="submit" variant="secondary">
              申请审批
            </Button>
          </form>
        )}
        {order.status === "confirmed" && (
          <form action={generatePickList.bind(null, id)}>
            <Button type="submit" variant="secondary">
              生成拣货单并锁单
            </Button>
          </form>
        )}
      </div>

      {!!approvals?.length && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">审批记录</h2>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {approvals.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b border-stone-100 py-2"
              >
                <span>
                  {item.approval_type} · {item.reason}
                </span>
                <Badge>{item.status}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
