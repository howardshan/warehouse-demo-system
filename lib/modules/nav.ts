export type ModuleId =
  | "dashboard"
  | "purchasing"
  | "warehouse_inbound"
  | "warehouse_outbound"
  | "sales"
  | "account"
  | "finance"
  | "it";

export type NavItem = {
  href: string;
  labelKey: string;
  permission: string;
};

export type NavModule = {
  id: ModuleId;
  labelKey: string;
  /** 任一权限即可看到该模块分组 */
  anyOf: string[];
  items: NavItem[];
};

export const NAV_MODULES: NavModule[] = [
  {
    id: "dashboard",
    labelKey: "modules.dashboard",
    anyOf: ["dashboard.view"],
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", permission: "dashboard.view" },
    ],
  },
  {
    id: "purchasing",
    labelKey: "modules.purchasing",
    anyOf: [
      "purchasing.po.read",
      "purchasing.po.write",
      "purchasing.receiving.write",
      "purchasing.price_alerts.write",
      "purchasing.suppliers.write",
      "master.products.write",
    ],
    items: [
      { href: "/purchasing/pos", labelKey: "nav.pos", permission: "purchasing.po.read" },
      {
        href: "/purchasing/receiving",
        labelKey: "nav.receiving",
        permission: "purchasing.receiving.write",
      },
      {
        href: "/purchasing/price-alerts",
        labelKey: "nav.priceAlerts",
        permission: "purchasing.price_alerts.write",
      },
      {
        href: "/master-data/suppliers",
        labelKey: "nav.suppliers",
        permission: "purchasing.suppliers.write",
      },
      {
        href: "/master-data/products",
        labelKey: "nav.products",
        permission: "master.products.write",
      },
    ],
  },
  {
    id: "warehouse_inbound",
    labelKey: "modules.warehouseInbound",
    anyOf: [
      "warehouse.stock.read",
      "warehouse.replenishment.write",
      "warehouse.repack.write",
      "warehouse.locations.write",
      "warehouse.returns.write",
    ],
    items: [
      { href: "/inventory/stock", labelKey: "nav.stock", permission: "warehouse.stock.read" },
      { href: "/inventory/batches", labelKey: "nav.batches", permission: "warehouse.stock.read" },
      {
        href: "/inventory/replenishment",
        labelKey: "nav.replenishment",
        permission: "warehouse.replenishment.write",
      },
      {
        href: "/inventory/quarantine",
        labelKey: "nav.quarantine",
        permission: "warehouse.stock.read",
      },
      {
        href: "/inventory/repack",
        labelKey: "nav.repack",
        permission: "warehouse.repack.write",
      },
      {
        href: "/returns/return-notes",
        labelKey: "nav.returnNotes",
        permission: "warehouse.returns.write",
      },
      {
        href: "/returns/disposition",
        labelKey: "nav.disposition",
        permission: "warehouse.returns.write",
      },
      {
        href: "/master-data/locations",
        labelKey: "nav.locations",
        permission: "warehouse.locations.write",
      },
      {
        href: "/master-data/totes",
        labelKey: "nav.totes",
        permission: "warehouse.locations.write",
      },
    ],
  },
  {
    id: "warehouse_outbound",
    labelKey: "modules.warehouseOutbound",
    anyOf: [
      "warehouse.picklists.write",
      "warehouse.picking.write",
      "warehouse.weighing.write",
      "warehouse.shipping.write",
      "warehouse.returns.write",
    ],
    items: [
      {
        href: "/warehouse/picklists",
        labelKey: "nav.picklists",
        permission: "warehouse.picklists.write",
      },
      {
        href: "/warehouse/picking",
        labelKey: "nav.picking",
        permission: "warehouse.picking.write",
      },
      {
        href: "/warehouse/weighing",
        labelKey: "nav.weighing",
        permission: "warehouse.weighing.write",
      },
      {
        href: "/warehouse/pending-weight",
        labelKey: "nav.pendingWeight",
        permission: "warehouse.weighing.write",
      },
      {
        href: "/warehouse/shipping",
        labelKey: "nav.shipping",
        permission: "warehouse.shipping.write",
      },
      { href: "/delivery/trips", labelKey: "nav.trips", permission: "warehouse.shipping.write" },
      { href: "/delivery/pod", labelKey: "nav.pod", permission: "warehouse.shipping.write" },
      {
        href: "/returns/adjustments",
        labelKey: "nav.adjustments",
        permission: "warehouse.returns.write",
      },
    ],
  },
  {
    id: "sales",
    labelKey: "modules.sales",
    anyOf: [
      "sales.orders.read",
      "sales.orders.write",
      "sales.approvals.write",
      "sales.history.read",
    ],
    items: [
      { href: "/sales/orders", labelKey: "nav.orders", permission: "sales.orders.read" },
      {
        href: "/sales/approvals",
        labelKey: "nav.approvals",
        permission: "sales.approvals.write",
      },
      { href: "/sales/history", labelKey: "nav.history", permission: "sales.history.read" },
      {
        href: "/sales/history/trace",
        labelKey: "nav.trace",
        permission: "sales.history.read",
      },
    ],
  },
  {
    id: "account",
    labelKey: "modules.account",
    anyOf: [
      "account.customers.read",
      "account.customers.write",
      "account.credit.read",
    ],
    items: [
      {
        href: "/customers",
        labelKey: "nav.customers",
        permission: "account.customers.read",
      },
      {
        href: "/finance/credit-control",
        labelKey: "nav.creditControl",
        permission: "account.credit.read",
      },
    ],
  },
  {
    id: "finance",
    labelKey: "modules.finance",
    anyOf: ["finance.billing.read", "finance.credit_control.write"],
    items: [
      {
        href: "/finance/billing-queue",
        labelKey: "nav.billingQueue",
        permission: "finance.billing.read",
      },
      {
        href: "/finance/credit-note-queue",
        labelKey: "nav.creditNoteQueue",
        permission: "finance.billing.read",
      },
      {
        href: "/finance/credit-control",
        labelKey: "nav.creditControl",
        permission: "finance.credit_control.write",
      },
    ],
  },
  {
    id: "it",
    labelKey: "modules.it",
    anyOf: ["it.users.manage", "it.permissions.manage", "master.settings.write"],
    items: [
      { href: "/it/users", labelKey: "nav.users", permission: "it.users.manage" },
      {
        href: "/it/permissions",
        labelKey: "nav.permissions",
        permission: "it.permissions.manage",
      },
      {
        href: "/settings",
        labelKey: "nav.settings",
        permission: "master.settings.write",
      },
    ],
  },
];

/** 路径 → 所需权限（用于 layout 守卫；满足任一即可） */
export function requiredPermissionsForPath(pathname: string): string[] | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard")) {
    return ["dashboard.view"];
  }
  for (const mod of NAV_MODULES) {
    for (const item of mod.items) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return [item.permission];
      }
    }
  }
  return null;
}
