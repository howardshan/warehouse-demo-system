import { redirect } from "next/navigation";
import { listAuditLog } from "@/app/actions/inventory";
import { getSessionAccess, can } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t, type Messages } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

const TABLE_LABEL_KEYS: Record<string, string> = {
  products: "pg.it.tableProducts",
  customers: "pg.it.tableCustomers",
  sales_orders: "pg.it.tableSalesOrders",
  so_lines: "pg.it.tableSoLines",
  stock: "pg.it.tableStock",
  batches: "pg.it.tableBatches",
  goods_receipts: "pg.it.tableGoodsReceipts",
  gr_lines: "pg.it.tableGrLines",
  purchase_orders: "pg.it.tablePurchaseOrders",
  po_lines: "pg.it.tablePoLines",
  inventory_adjustments: "pg.it.tableInventoryAdjustments",
  replenishment_tasks: "pg.it.tableReplenishmentTasks",
  suppliers: "pg.it.tableSuppliers",
  locations: "pg.it.tableLocations",
  settings: "pg.it.tableSettings",
  user_profiles: "pg.it.tableUserProfiles",
  user_permissions: "pg.it.tableUserPermissions",
  shipping_lists: "pg.it.tableShippingLists",
  sl_lines: "pg.it.tableSlLines",
  return_notes: "pg.it.tableReturnNotes",
  return_lines: "pg.it.tableReturnLines",
};

const ACTION_LABEL_KEYS: Record<string, string> = {
  insert: "pg.it.actionInsert",
  update: "pg.it.actionUpdate",
  delete: "pg.it.actionDelete",
};

function tableLabel(messages: Messages, name: string) {
  const key = TABLE_LABEL_KEYS[name];
  return key ? t(messages, key, name) : name;
}

function summarizeDiff(
  messages: Messages,
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
) {
  if (action === "insert" && newValues) {
    const keys = Object.keys(newValues).slice(0, 6);
    return keys.map((k) => `${k}=${JSON.stringify(newValues[k])}`).join(" · ");
  }
  if (action === "delete" && oldValues) {
    return t(messages, "pg.it.recordDeleted");
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
    return changed.join(" · ") || t(messages, "pg.it.noFieldChange");
  }
  return "—";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const access = await getSessionAccess();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
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

  const tables = Object.keys(TABLE_LABEL_KEYS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t(messages, "pg.it.auditLogTitle")}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.it.auditLogHint")}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            {t(messages, "pg.it.filterByTable")}
          </label>
          <Select name="table" defaultValue={tableName ?? ""} className="w-56">
            <option value="">{t(messages, "pg.it.all")}</option>
            {tables.map((name) => (
              <option key={name} value={name}>
                {tableLabel(messages, name)} ({name})
              </option>
            ))}
          </Select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-md bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900"
        >
          {t(messages, "pg.it.filter")}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">{t(messages, "pg.it.colTime")}</th>
              <th className="px-4 py-3">{t(messages, "pg.it.colObject")}</th>
              <th className="px-4 py-3">{t(messages, "pg.it.colAction")}</th>
              <th className="px-4 py-3">{t(messages, "pg.it.colOperator")}</th>
              <th className="px-4 py-3">{t(messages, "pg.it.colRecordId")}</th>
              <th className="px-4 py-3">{t(messages, "pg.it.colSummary")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-stone-100 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
                  {new Date(row.created_at).toLocaleString("zh-CN")}
                </td>
                <td className="px-4 py-3">
                  {tableLabel(messages, row.table_name)}
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
                    {ACTION_LABEL_KEYS[row.action]
                      ? t(messages, ACTION_LABEL_KEYS[row.action], row.action)
                      : row.action}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">
                  {row.changed_by
                    ? (nameMap.get(row.changed_by) ??
                      row.changed_by.slice(0, 8))
                    : t(messages, "pg.it.system")}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-stone-500">
                  {row.record_id.slice(0, 8)}…
                </td>
                <td className="max-w-md px-4 py-3 text-xs break-all text-stone-600">
                  {summarizeDiff(
                    messages,
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
                  {t(messages, "pg.it.auditEmpty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
