import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  PackagePlus,
  Truck,
  Receipt,
  Users,
  Wallet,
  Settings,
} from "lucide-react";
import type { ModuleId } from "./nav";

export type ModuleVisual = {
  Icon: LucideIcon;
  /** 图标底片背景 */
  chip: string;
  /** 图标颜色 */
  icon: string;
  /** hover 时卡片边框强调色 */
  ring: string;
};

export const MODULE_VISUALS: Record<ModuleId, ModuleVisual> = {
  dashboard: {
    Icon: LayoutDashboard,
    chip: "bg-teal-50",
    icon: "text-teal-700",
    ring: "hover:border-teal-600/50",
  },
  purchasing: {
    Icon: ShoppingCart,
    chip: "bg-amber-50",
    icon: "text-amber-700",
    ring: "hover:border-amber-600/50",
  },
  warehouse_inbound: {
    Icon: PackagePlus,
    chip: "bg-sky-50",
    icon: "text-sky-700",
    ring: "hover:border-sky-600/50",
  },
  warehouse_outbound: {
    Icon: Truck,
    chip: "bg-indigo-50",
    icon: "text-indigo-700",
    ring: "hover:border-indigo-600/50",
  },
  sales: {
    Icon: Receipt,
    chip: "bg-rose-50",
    icon: "text-rose-700",
    ring: "hover:border-rose-600/50",
  },
  account: {
    Icon: Users,
    chip: "bg-violet-50",
    icon: "text-violet-700",
    ring: "hover:border-violet-600/50",
  },
  finance: {
    Icon: Wallet,
    chip: "bg-emerald-50",
    icon: "text-emerald-700",
    ring: "hover:border-emerald-600/50",
  },
  it: {
    Icon: Settings,
    chip: "bg-stone-100",
    icon: "text-stone-700",
    ring: "hover:border-stone-500/50",
  },
};
