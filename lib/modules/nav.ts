export type ModuleId =
  | "dashboard"
  | "purchasing"
  | "warehouse_inbound"
  | "warehouse_outbound"
  | "sales"
  | "account"
  | "finance"
  | "it";

/** 收货流程四步（侧栏子项；进单据后按当前 id 跳转对应页） */
export type ReceivingStep = "blind" | "shipping" | "invoice" | "match";

export type NavItem = {
  href: string;
  labelKey: string;
  permission: string;
  /** 可选：嵌套子菜单（如原产品 / 收货） */
  children?: NavItem[];
  /** 收货四步：动态链接与高亮 */
  receivingStep?: ReceivingStep;
};

const RECEIVING_ID_RE =
  /^\/purchasing\/receiving\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

export function extractReceivingId(pathname: string): string | null {
  const m = pathname.match(RECEIVING_ID_RE);
  return m?.[1] ?? null;
}

export function receivingStepHref(
  pathname: string,
  step: ReceivingStep,
): string {
  const id = extractReceivingId(pathname);
  if (!id) return "/purchasing/receiving";
  const base = `/purchasing/receiving/${id}`;
  switch (step) {
    case "blind":
      return base;
    case "shipping":
      return `${base}/delivery-note`;
    case "invoice":
      return `${base}/invoice`;
    case "match":
      return `${base}/match`;
  }
}

export function isReceivingStepActive(
  pathname: string,
  step: ReceivingStep,
): boolean {
  const id = extractReceivingId(pathname);
  if (!id) {
    return step === "blind" && pathname === "/purchasing/receiving";
  }
  if (pathname.startsWith(`/purchasing/receiving/${id}/delivery-note`)) {
    return step === "shipping";
  }
  if (pathname.startsWith(`/purchasing/receiving/${id}/invoice`)) {
    return step === "invoice";
  }
  if (pathname.startsWith(`/purchasing/receiving/${id}/match`)) {
    return step === "match";
  }
  return step === "blind" && pathname === `/purchasing/receiving/${id}`;
}

export type NavModule = {
  id: ModuleId;
  labelKey: string;
  /** 模块门户卡片的一句话说明 */
  descKey: string;
  /** 任一权限即可看到该模块分组 */
  anyOf: string[];
  items: NavItem[];
};

/** 模块门户 / 侧栏落地路径 */
export function modulePath(id: ModuleId): string {
  return id === "dashboard" ? "/dashboard" : `/m/${id}`;
}

const MODULE_SEG_RE = /^\/m\/([a-z_]+)/;

/** 由当前 pathname 反推所属模块（/m/<id> 优先，其次按导航项前缀匹配） */
export function findModuleId(pathname: string): ModuleId | null {
  const seg = pathname.match(MODULE_SEG_RE)?.[1];
  if (seg && NAV_MODULES.some((m) => m.id === seg)) {
    return seg as ModuleId;
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "dashboard";
  }
  for (const mod of NAV_MODULES) {
    for (const item of mod.items) {
      const candidates = item.children?.length
        ? [...item.children, item]
        : [item];
      for (const cand of candidates) {
        if (pathname === cand.href || pathname.startsWith(cand.href + "/")) {
          return mod.id;
        }
      }
    }
  }
  return null;
}

export const NAV_MODULES: NavModule[] = [
  {
    id: "dashboard",
    labelKey: "modules.dashboard",
    descKey: "modules.dashboardDesc",
    anyOf: ["dashboard.view"],
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", permission: "dashboard.view" },
    ],
  },
  {
    id: "purchasing",
    labelKey: "modules.purchasing",
    descKey: "modules.purchasingDesc",
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
        children: [
          {
            href: "/purchasing/receiving",
            labelKey: "nav.receivingBlind",
            permission: "purchasing.receiving.write",
            receivingStep: "blind",
          },
          {
            href: "/purchasing/receiving/shipping",
            labelKey: "nav.receivingShipping",
            permission: "purchasing.receiving.write",
            receivingStep: "shipping",
          },
          {
            href: "/purchasing/receiving/invoice",
            labelKey: "nav.receivingInvoice",
            permission: "purchasing.receiving.write",
            receivingStep: "invoice",
          },
          {
            href: "/purchasing/receiving/match",
            labelKey: "nav.receivingMatch",
            permission: "purchasing.receiving.write",
            receivingStep: "match",
          },
        ],
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
        href: "/purchasing/families",
        labelKey: "nav.productFamilyGroup",
        permission: "master.products.write",
        children: [
          {
            href: "/purchasing/categories",
            labelKey: "nav.productCategories",
            permission: "master.products.write",
          },
          {
            href: "/purchasing/families/new",
            labelKey: "nav.productFamiliesNew",
            permission: "master.products.write",
          },
          {
            href: "/purchasing/families",
            labelKey: "nav.productFamilies",
            permission: "master.products.write",
          },
          {
            href: "/master-data/products",
            labelKey: "nav.products",
            permission: "master.products.write",
          },
        ],
      },
    ],
  },
  {
    id: "warehouse_inbound",
    labelKey: "modules.warehouseInbound",
    descKey: "modules.warehouseInboundDesc",
    anyOf: [
      "warehouse.stock.read",
      "warehouse.stock.adjust",
      "warehouse.replenishment.write",
      "warehouse.repack.write",
      "warehouse.locations.write",
      "warehouse.returns.write",
    ],
    items: [
      { href: "/inventory/stock", labelKey: "nav.stock", permission: "warehouse.stock.read" },
      {
        href: "/inventory/adj",
        labelKey: "nav.stockAdj",
        permission: "warehouse.stock.adjust",
      },
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
    descKey: "modules.warehouseOutboundDesc",
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
    descKey: "modules.salesDesc",
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
    descKey: "modules.accountDesc",
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
    descKey: "modules.financeDesc",
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
    descKey: "modules.itDesc",
    anyOf: [
      "it.users.manage",
      "it.permissions.manage",
      "master.settings.write",
      "audit.log.read",
    ],
    items: [
      { href: "/it/users", labelKey: "nav.users", permission: "it.users.manage" },
      {
        href: "/it/permissions",
        labelKey: "nav.permissions",
        permission: "it.permissions.manage",
      },
      {
        href: "/it/role-permissions",
        labelKey: "nav.rolePermissions",
        permission: "it.permissions.manage",
      },
      {
        href: "/it/audit-log",
        labelKey: "nav.auditLog",
        permission: "audit.log.read",
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
  let best: { href: string; permission: string } | null = null;
  for (const mod of NAV_MODULES) {
    for (const item of mod.items) {
      const candidates = item.children?.length ? [...item.children, item] : [item];
      for (const cand of candidates) {
        if (pathname === cand.href || pathname.startsWith(cand.href + "/")) {
          if (!best || cand.href.length > best.href.length) {
            best = { href: cand.href, permission: cand.permission };
          }
        }
      }
    }
  }
  return best ? [best.permission] : null;
}
