import { approveMarginApproval, rejectMarginApproval } from "@/app/actions/sales";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

export default async function SalesApprovalsPage() {
  const supabase = await createClient();
  const { data: approvals } = await supabase.from("so_approvals")
    .select("id, approval_type, reason, requested_at, sales_orders(so_number, customer_name_snapshot)")
    .eq("status", "pending").order("requested_at");
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">销售审批</h1><p className="mt-1 text-sm text-stone-500">处理低毛利及低于成本订单；批准后自动重新执行订单闸门。</p></div>
    <Card><CardHeader><h2 className="font-semibold">待处理申请</h2></CardHeader><CardBody className="space-y-3">
      {(approvals ?? []).map((approval) => {
        const order = approval.sales_orders as unknown as { so_number: string; customer_name_snapshot: string };
        return <form key={approval.id} className="grid gap-3 rounded border border-stone-100 p-4 md:grid-cols-[1fr_280px_auto]">
          <div><div className="font-medium">{order.so_number} · {order.customer_name_snapshot} <Badge tone="warn">{approval.approval_type}</Badge></div><div className="mt-1 text-sm text-stone-500">{approval.reason}</div></div>
          <Input name="decision_note" placeholder="审批意见（可选）" />
          <div className="flex gap-2"><Button formAction={approveMarginApproval.bind(null, approval.id)} type="submit" size="sm">批准</Button><Button formAction={rejectMarginApproval.bind(null, approval.id)} type="submit" size="sm" variant="danger">拒绝</Button></div>
        </form>;
      })}
      {!approvals?.length && <p className="text-sm text-stone-400">当前没有待审批订单</p>}
    </CardBody></Card>
  </div>;
}
