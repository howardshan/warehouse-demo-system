import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSessionAccess, canAny, can } from "@/lib/auth/access";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { NAV_MODULES, type ModuleId, type NavItem } from "@/lib/modules/nav";
import { MODULE_VISUALS } from "@/lib/modules/module-meta";

export default async function ModuleLandingPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const mod = NAV_MODULES.find((m) => m.id === module);
  if (!mod) notFound();

  const access = await getSessionAccess();
  if (!canAny(access.permissions, mod.anyOf)) {
    redirect("/hub");
  }

  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  // 仅保留有权限的功能项（含子项过滤）
  const items = mod.items
    .map((item) => {
      if (!item.children?.length) {
        return can(access.permissions, item.permission) ? item : null;
      }
      const children = item.children.filter((c) =>
        can(access.permissions, c.permission),
      );
      return children.length ? { ...item, children } : null;
    })
    .filter((i): i is NavItem => i != null);

  const { Icon, chip, icon } = MODULE_VISUALS[mod.id as ModuleId];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/hub"
          className="text-sm text-stone-500 transition hover:text-teal-700"
        >
          ← {t(messages, "modules.allModules", "全部模块")}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${chip}`}
          >
            <Icon className={`h-5 w-5 ${icon}`} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">
              {t(messages, mod.labelKey)}
            </h1>
            <p className="text-sm text-stone-500">
              {t(messages, mod.descKey, "")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.href + item.labelKey}
            className="flex flex-col rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
          >
            <Link
              href={item.href}
              className="text-base font-semibold text-stone-900 transition hover:text-teal-700"
            >
              {t(messages, item.labelKey)}
            </Link>
            {item.children?.length ? (
              <div className="mt-3 flex flex-col gap-1">
                {item.children.map((child) => (
                  <Link
                    key={child.href + child.labelKey}
                    href={child.href}
                    className="text-sm text-stone-500 transition hover:text-teal-700"
                  >
                    {t(messages, child.labelKey)}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                href={item.href}
                className="mt-3 text-sm font-medium text-teal-700 transition hover:text-teal-800"
              >
                {t(messages, "modules.open", "打开")} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
