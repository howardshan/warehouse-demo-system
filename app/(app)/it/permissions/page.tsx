import { redirect } from "next/navigation";

/**
 * 「用户权限覆盖」已整合进用户管理页（/it/users）。
 * 保留此路由做重定向，兼容旧链接/书签。
 */
export default async function ItPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const sp = await searchParams;
  redirect(sp.user ? `/it/users?user=${sp.user}` : "/it/users");
}
