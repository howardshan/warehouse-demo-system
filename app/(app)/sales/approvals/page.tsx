import { approveMarginApproval, rejectMarginApproval } from "@/app/actions/sales";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export default async function SalesApprovalsPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: approvals } = await supabase.from("so_approvals")
    .select("id, approval_type, reason, requested_at, sales_orders(so_number, customer_name_snapshot)")
    .eq("status", "pending").order("requested_at");
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.sales.approvals.title")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.sales.approvals.subtitle")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.sales.approvals.pending")}</h2></CardHeader><CardBody className="space-y-3">
      {(approvals ?? []).map((approval) => {
        const order = approval.sales_orders as unknown as { so_number: string; customer_name_snapshot: string };
        return <form key={approval.id} className="grid gap-3 rounded border border-stone-100 p-4 md:grid-cols-[1fr_280px_auto]">
          <div><div className="font-medium">{order.so_number} · {order.customer_name_snapshot} <Badge tone="warn">{approval.approval_type}</Badge></div><div className="mt-1 text-sm text-stone-500">{approval.reason}</div></div>
          <Input name="decision_note" placeholder={t(messages, "pg.sales.approvals.decisionNote")} />
          <div className="flex gap-2"><Button formAction={approveMarginApproval.bind(null, approval.id)} type="submit" size="sm">{t(messages, "pg.sales.approvals.approve")}</Button><Button formAction={rejectMarginApproval.bind(null, approval.id)} type="submit" size="sm" variant="danger">{t(messages, "pg.sales.approvals.reject")}</Button></div>
        </form>;
      })}
      {!approvals?.length && <p className="text-sm text-stone-400">{t(messages, "pg.sales.approvals.empty")}</p>}
    </CardBody></Card>
  </div>;
}
