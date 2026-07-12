"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "看板" },
  { href: "/purchasing/pos", label: "采购订单" },
  { href: "/purchasing/receiving", label: "采购收货" },
  { href: "/purchasing/price-alerts", label: "涨价提醒" },
  { href: "/inventory/batches", label: "批次" },
  { href: "/inventory/stock", label: "库存余额" },
  { href: "/inventory/replenishment", label: "FEFO 补货" },
  { href: "/inventory/quarantine", label: "隔离库存" },
  { href: "/inventory/repack", label: "重包工单" },
  { href: "/sales/orders", label: "销售订单" },
  { href: "/sales/approvals", label: "销售审批" },
  { href: "/sales/history", label: "销售历史" },
  { href: "/sales/history/trace", label: "批号追溯" },
  { href: "/warehouse/picklists", label: "拣货单" },
  { href: "/warehouse/picking", label: "拣货 ①" },
  { href: "/warehouse/weighing", label: "称重 ②" },
  { href: "/warehouse/pending-weight", label: "待称重看板" },
  { href: "/warehouse/shipping", label: "发运" },
  { href: "/delivery/trips", label: "配送趟次" },
  { href: "/delivery/pod", label: "交付凭证 POD" },
  { href: "/returns/return-notes", label: "退货单" },
  { href: "/returns/disposition", label: "退货处置" },
  { href: "/returns/adjustments", label: "配送调整" },
  { href: "/finance/billing-queue", label: "开票队列" },
  { href: "/finance/credit-note-queue", label: "贷项通知队列" },
  { href: "/finance/credit-control", label: "信用控制" },
  { href: "/master-data/products", label: "商品" },
  { href: "/master-data/suppliers", label: "供应商" },
  { href: "/master-data/locations", label: "储位" },
  { href: "/master-data/totes", label: "周转筐" },
  { href: "/customers", label: "客户" },
  { href: "/settings", label: "设置" },
];

export function AppSidebar({
  userEmail,
  role,
}: {
  userEmail?: string | null;
  role?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-stone-200 bg-[#1a2e28] text-stone-100">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="text-xs uppercase tracking-[0.2em] text-teal-200/80">
          Food Distribution
        </div>
        <div className="mt-1 text-lg font-semibold tracking-tight">
          仓配管理系统
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-teal-700/40 text-white"
                  : "text-stone-300 hover:bg-white/5 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-xs text-stone-400">
        <div className="truncate">{userEmail}</div>
        <div className="mt-0.5 text-teal-200/70">{role ?? "—"}</div>
      </div>
    </aside>
  );
}
