import Link from "next/link";
import { getSessionAccess, canAny, can } from "@/lib/auth/access";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { NAV_MODULES, modulePath, type NavItem } from "@/lib/modules/nav";
import { MODULE_VISUALS } from "@/lib/modules/module-meta";

function leafCount(items: NavItem[], permissions: string[]): number {
  let n = 0;
  for (const item of items) {
    if (item.children?.length) {
      n += item.children.filter((c) => can(permissions, c.permission)).length;
    } else if (can(permissions, item.permission)) {
      n += 1;
    }
  }
  return n;
}

export default async function HubPage() {
  const access = await getSessionAccess();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  const modules = NAV_MODULES.filter((mod) =>
    canAny(access.permissions, mod.anyOf),
  ).map((mod) => ({
    mod,
    count: leafCount(mod.items, access.permissions),
    visual: MODULE_VISUALS[mod.id],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          {t(messages, "modules.hubTitle", "工作台")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "modules.hubSubtitle", "选择一个模块进入")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map(({ mod, count, visual }) => {
          const { Icon, chip, icon, ring } = visual;
          return (
            <Link
              key={mod.id}
              href={modulePath(mod.id)}
              className={`group flex flex-col rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition ${ring} hover:shadow-md`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${chip}`}
                >
                  <Icon className={`h-5 w-5 ${icon}`} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-stone-900">
                    {t(messages, mod.labelKey)}
                  </div>
                  <div className="text-xs text-stone-400">
                    {count} {t(messages, "modules.itemsSuffix", "项功能")}
                  </div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-stone-500">
                {t(messages, mod.descKey, "")}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-700 opacity-0 transition group-hover:opacity-100">
                {t(messages, "modules.enter", "进入")} →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
