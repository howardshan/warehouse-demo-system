import { redirect } from "next/navigation";
import { listAuditLog } from "@/app/actions/inventory";
import { getSessionAccess, can } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

const TABLE_LABELS: Record<string, string> = {
  products: "商品",
  customers: "客户",
  sales_orders: "销售订单",
  so_lines: "销售订单行",
  stock: "库存",
  batches: "批次",
  goods_receipts: "收货单",
  gr_lines: "收货行",
  purchase_orders: "采购订单",
  po_lines: "采购订单行",
  inventory_adjustments: "库存调整",
  replenishment_tasks: "补货任务",
  suppliers: "供应商",
  locations: "储位",
  settings: "系统设置",
  user_profiles: "用户档案",
  user_permissions: "用户权限",
  shipping_lists: "发运单",
  sl_lines: "发运行",
  return_notes: "退货单",
  return_lines: "退货行",
};

const ACTION_LABELS: Record<string, string> = {
  insert: "创建",
  update: "修改",
  delete: "删除",
};

function summarizeDiff(
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
) {
  if (action === "insert" && newValues) {
    const keys = Object.keys(newValues).slice(0, 6);
    return keys.map((k) => `${k}=${JSON.stringify(newValues[k])}`).join(" · ");
  }
  if (action === "delete" && oldValues) {
    return "记录已删除";
  }
  if (oldValues && newValues) {
    const changed: string[] = [];
    for (const key of Object.keys(newValues)) {
      if (
        JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]) &&
        !["updated_at", "created_at"].includes(key)
      ) {
        changed.push(
          `${key}: ${JSON.stringify(oldValues[key])} → ${JSON.stringify(newValues[key])}`,
        );
      }
      if (changed.length >= 5) break;
    }
    return changed.join(" · ") || "（无字段变化或仅时间戳）";
  }
  return "—";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const access = await getSessionAccess();
  if (!can(access.permissions, "audit.log.read")) {
    redirect("/dashboard");
  }

  const { table } = await searchParams;
  const tableName = table?.trim() || null;
  const rows = await listAuditLog({ tableName, limit: 200 });

  const supabase = await createClient();
  const userIds = [
    ...new Set(rows.map((r) => r.changed_by).filter(Boolean) as string[]),
  ];
  const nameMap = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.full_name || p.id.slice(0, 8));
    }
  }

  const tables = Object.keys(TABLE_LABELS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">操作日志</h1>
        <p className="mt-1 text-sm text-stone-500">
          系统对创建、修改、删除的统一留痕。库存调整、收货、销售、主数据等关键变更均记录于此。
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            按表筛选
          </label>
          <Select name="table" defaultValue={tableName ?? ""} className="w-56">
            <option value="">全部</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {TABLE_LABELS[t] ?? t} ({t})
              </option>
            ))}
          </Select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-md bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900"
        >
          筛选
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">对象</th>
              <th className="px-4 py-3">动作</th>
              <th className="px-4 py-3">操作人</th>
              <th className="px-4 py-3">记录 ID</th>
              <th className="px-4 py-3">变更摘要</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-stone-100 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
                  {new Date(row.created_at).toLocaleString("zh-CN")}
                </td>
                <td className="px-4 py-3">
                  {TABLE_LABELS[row.table_name] ?? row.table_name}
                  <div className="font-mono text-[10px] text-stone-400">
                    {row.table_name}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      row.action === "delete"
                        ? "danger"
                        : row.action === "insert"
                          ? "ok"
                          : "neutral"
                    }
                  >
                    {ACTION_LABELS[row.action] ?? row.action}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">
                  {row.changed_by
                    ? (nameMap.get(row.changed_by) ??
                      row.changed_by.slice(0, 8))
                    : "系统"}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-stone-500">
                  {row.record_id.slice(0, 8)}…
                </td>
                <td className="max-w-md px-4 py-3 text-xs break-all text-stone-600">
                  {summarizeDiff(
                    row.action,
                    row.old_values as Record<string, unknown> | null,
                    row.new_values as Record<string, unknown> | null,
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-stone-400"
                >
                  暂无日志
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
