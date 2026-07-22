"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NAV_MODULES,
  findModuleId,
  modulePath,
  isReceivingStepActive,
  receivingStepHref,
  type NavItem,
  type ModuleId,
} from "@/lib/modules/nav";
import { MODULE_VISUALS } from "@/lib/modules/module-meta";
import { useI18n } from "@/components/i18n/provider";
import { can, canAny } from "@/lib/auth/access-client";

const STORAGE_KEY = "wd_sidebar_collapsed";

function itemMatchesPath(item: NavItem, pathname: string): boolean {
  if (item.children?.length) {
    return item.children.some((c) =>
      childIsActive(c, pathname, item.children!),
    );
  }
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function childIsActive(
  child: NavItem,
  pathname: string,
  siblings: NavItem[],
): boolean {
  if (child.receivingStep) {
    return isReceivingStepActive(pathname, child.receivingStep);
  }
  return isLeafActive(child.href, pathname, siblings);
}

function childHref(child: NavItem, pathname: string): string {
  if (child.receivingStep) {
    return receivingStepHref(pathname, child.receivingStep);
  }
  return child.href;
}

function isLeafActive(href: string, pathname: string, siblings: NavItem[]) {
  const exact = pathname === href;
  const prefix = pathname.startsWith(href + "/");
  if (!exact && !prefix) return false;
  // 更长的 sibling href 优先（避免 /families 盖住 /families/new）
  const longerTakes = siblings.some(
    (s) =>
      s.href !== href &&
      s.href.length > href.length &&
      (pathname === s.href || pathname.startsWith(s.href + "/")),
  );
  return !longerTakes;
}

export function AppSidebar({
  userEmail,
  role,
  permissions,
}: {
  userEmail?: string | null;
  role?: string | null;
  permissions: string[];
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated]);

  // 有权限可见的模块
  const modules = useMemo(
    () =>
      NAV_MODULES.map((mod) => ({
        ...mod,
        items: mod.items
          .map((item) => {
            if (!item.children?.length) {
              return can(permissions, item.permission) ? item : null;
            }
            const children = item.children.filter((c) =>
              can(permissions, c.permission),
            );
            if (children.length === 0) return null;
            return { ...item, children };
          })
          .filter((item): item is NavItem => item != null),
      })).filter((m) => canAny(permissions, m.anyOf) && m.items.length > 0),
    [permissions],
  );

  const activeModuleId = findModuleId(pathname);
  const activeModule = modules.find((m) => m.id === activeModuleId) ?? null;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeModule) return;
    for (const item of activeModule.items) {
      if (item.children?.length && itemMatchesPath(item, pathname)) {
        setOpenGroups((prev) => ({ ...prev, [item.href]: true }));
      }
    }
  }, [activeModule, pathname]);

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col border-r border-stone-200 bg-[#1a2e28] text-stone-100 transition-[width] duration-200 ease-out",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-2 border-b border-white/10",
          collapsed ? "justify-center px-2 py-4" : "px-4 py-5",
        )}
      >
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-[0.2em] text-teal-200/80">
              {t("app.tagline")}
            </div>
            <div className="mt-1 truncate text-lg font-semibold tracking-tight">
              {t("app.name")}
            </div>
          </div>
        )}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-300 transition hover:bg-white/10 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {collapsed ? (
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto p-2">
          <Link
            href="/hub"
            title={t("modules.allModules")}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-md transition",
              !activeModule
                ? "bg-teal-700/40 text-white"
                : "text-teal-200/90 hover:bg-white/10",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Link>
          {modules.map((mod) => {
            const active = activeModuleId === mod.id;
            const { Icon } = MODULE_VISUALS[mod.id as ModuleId];
            return (
              <Link
                key={mod.id}
                href={modulePath(mod.id)}
                title={t(mod.labelKey)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition",
                  active
                    ? "bg-teal-700/40 text-white"
                    : "text-stone-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </nav>
      ) : (
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          <Link
            href="/hub"
            className={cn(
              "mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
              !activeModule
                ? "bg-white/10 text-teal-100"
                : "text-stone-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>{t("modules.allModules")}</span>
          </Link>

          {activeModule ? (
            <div className="rounded-md pt-1">
              <div className="px-3 py-2 text-sm font-semibold tracking-wide text-teal-100">
                {t(activeModule.labelKey)}
              </div>
              <div className="mt-0.5 space-y-0.5 pb-1 pl-1">
                {activeModule.items.map((item) => {
                  if (item.children?.length) {
                    const groupOpen =
                      openGroups[item.href] ??
                      itemMatchesPath(item, pathname);
                    return (
                      <div key={item.href} className="pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenGroups((prev) => ({
                              ...prev,
                              [item.href]: !groupOpen,
                            }))
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm font-medium transition",
                            itemMatchesPath(item, pathname)
                              ? "text-teal-100"
                              : "text-stone-300 hover:bg-white/5 hover:text-white",
                          )}
                        >
                          <span>{t(item.labelKey)}</span>
                          <span className="text-[10px] opacity-70">
                            {groupOpen ? "−" : "+"}
                          </span>
                        </button>
                        {groupOpen && (
                          <div className="mt-0.5 space-y-0.5 border-l border-white/10 ml-3 pl-2">
                            {item.children.map((child) => {
                              const active = childIsActive(
                                child,
                                pathname,
                                item.children!,
                              );
                              return (
                                <Link
                                  key={child.labelKey}
                                  href={childHref(child, pathname)}
                                  className={cn(
                                    "block rounded-md px-2 py-1.5 text-sm transition",
                                    active
                                      ? "bg-teal-700/40 text-white"
                                      : "text-stone-400 hover:bg-white/5 hover:text-white",
                                  )}
                                >
                                  {t(child.labelKey)}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const active = isLeafActive(
                    item.href,
                    pathname,
                    activeModule.items.filter((i) => !i.children?.length),
                  );
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block rounded-md px-3 py-1.5 text-sm transition",
                        active
                          ? "bg-teal-700/40 text-white"
                          : "text-stone-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-0.5 pt-1">
              {modules.map((mod) => {
                const { Icon } = MODULE_VISUALS[mod.id as ModuleId];
                return (
                  <Link
                    key={mod.id}
                    href={modulePath(mod.id)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Icon className="h-4 w-4 opacity-80" />
                    <span>{t(mod.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      )}

      {!collapsed && (
        <div className="border-t border-white/10 px-4 py-3 text-xs text-stone-400">
          <div className="truncate">{userEmail}</div>
          <div className="mt-0.5 text-teal-200/70">{role ?? "—"}</div>
        </div>
      )}
    </aside>
  );
}
