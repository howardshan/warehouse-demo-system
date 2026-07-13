import { redirect } from "next/navigation";
import { getSessionAccess, can } from "@/lib/auth/access";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { signOut } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { I18nProvider, LanguageSwitcher } from "@/components/i18n/provider";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { requiredPermissionsForPath } from "@/lib/modules/nav";
import { headers } from "next/headers";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getSessionAccess();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  const headerList = await headers();
  const pathname =
    headerList.get("x-pathname") ||
    headerList.get("x-invoke-path") ||
    "";

  // Soft gate: if middleware set path and user lacks permission
  if (pathname && access.user) {
    const needed = requiredPermissionsForPath(pathname);
    if (
      needed &&
      needed.length > 0 &&
      !needed.some((k) => can(access.permissions, k)) &&
      pathname !== "/dashboard"
    ) {
      // allow render of no-access only via dashboard redirect in pages;
      // layout still shows shell
    }
  }

  if (!access.user) {
    redirect("/login");
  }

  return (
    <I18nProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen">
        <AppSidebar
          userEmail={access.user.email}
          role={access.role}
          permissions={access.permissions}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-4 border-b border-stone-200/80 bg-white/70 px-6 backdrop-blur">
            <div className="text-sm text-stone-500">{t(messages, "app.phase")}</div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  {t(messages, "app.signOut")}
                </Button>
              </form>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </I18nProvider>
  );
}
