/** 与 user_profiles.role / app_role 枚举一致 */
export const APP_ROLES = [
  "admin",
  "it",
  "purchasing",
  "warehouse",
  "sales",
  "sales_manager",
  "account",
  "finance",
  "driver",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: "管理员",
  it: "IT",
  purchasing: "采购",
  warehouse: "仓库",
  sales: "销售",
  sales_manager: "销售经理",
  account: "账户",
  finance: "财务",
  driver: "司机",
};

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}
