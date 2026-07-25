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

// 角色的展示名称已本地化，见 messages/*.json 的 `roles` 命名空间（t("roles." + role)）。

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}
