"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_MODULES } from "@/lib/modules/nav";
import { useI18n } from "@/components/i18n/provider";
import { can, canAny } from "@/lib/auth/access-client";

const STORAGE_KEY = "wd_sidebar_collapsed";

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

  const modules = useMemo(
    () =>
      NAV_MODULES.map((mod) => ({
        ...mod,
        visible: canAny(permissions, mod.anyOf),
        items: mod.items.filter((item) => can(permissions, item.permission)),
      })).filter((m) => m.visible && m.items.length > 0),
    [permissions],
  );

  const activeModuleId = useMemo(() => {
    for (const mod of modules) {
      if (
        mod.items.some(
          (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
        )
      ) {
        return mod.id;
      }
    }
    return modules[0]?.id ?? "dashboard";
  }, [modules, pathname]);

  const [openId, setOpenId] = useState<string | null>(activeModuleId);

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
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-teal-200/90 hover:bg-white/10"
            title={t("app.name")}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          {modules.map((mod) => {
            const active = activeModuleId === mod.id;
            const first = mod.items[0];
            if (!first) return null;
            return (
              <Link
                key={mod.id}
                href={first.href}
                title={t(mod.labelKey)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold uppercase tracking-wide transition",
                  active
                    ? "bg-teal-700/40 text-white"
                    : "text-stone-400 hover:bg-white/5 hover:text-white",
                )}
              >
                {t(mod.labelKey).slice(0, 1)}
              </Link>
            );
          })}
        </nav>
      ) : (
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {modules.map((mod) => {
            const open = openId === mod.id || activeModuleId === mod.id;
            return (
              <div key={mod.id} className="rounded-md">
                <button
                  type="button"
                  onClick={() =>
                    setOpenId((prev) => (prev === mod.id ? null : mod.id))
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold tracking-wide transition",
                    open
                      ? "bg-white/10 text-teal-100"
                      : "text-stone-400 hover:bg-white/5 hover:text-stone-200",
                  )}
                >
                  <span>{t(mod.labelKey)}</span>
                  <span className="text-[10px] opacity-70">
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open && (
                  <div className="mt-0.5 space-y-0.5 pb-1 pl-1">
                    {mod.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");
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
                )}
              </div>
            );
          })}
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
