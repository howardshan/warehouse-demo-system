import type { Locale } from "@/lib/i18n/config";

/**
 * 权限点 / 模块的本地化展示标签（供 IT 权限管理界面使用）。
 * permissions 表里的 description 是开发用的原始文本，不随语言切换；
 * 这里给每个权限点一套友好、可读、三语的名称与说明。
 * 权限点本身（key）是唯一真相，此文件只影响展示。
 */

type L = { name: string; desc: string };

/** 模块展示顺序（业务流顺序，覆盖 permissions.module 的字母序）。 */
export const MODULE_ORDER = [
  "dashboard",
  "sales",
  "account",
  "warehouse",
  "purchasing",
  "finance",
  "master",
  "it",
] as const;

export const MODULE_LABELS: Record<string, Record<Locale, string>> = {
  dashboard: { zh: "看板", en: "Dashboard", "es-MX": "Panel" },
  sales: { zh: "销售", en: "Sales", "es-MX": "Ventas" },
  account: { zh: "客户与信用", en: "Customers & Credit", "es-MX": "Clientes y crédito" },
  warehouse: { zh: "仓库作业", en: "Warehouse", "es-MX": "Almacén" },
  purchasing: { zh: "采购收货", en: "Purchasing & Receiving", "es-MX": "Compras y recepción" },
  finance: { zh: "财务", en: "Finance", "es-MX": "Finanzas" },
  master: { zh: "主数据", en: "Master Data", "es-MX": "Datos maestros" },
  it: { zh: "系统管理", en: "IT & Admin", "es-MX": "TI y administración" },
};

export const PERMISSION_LABELS: Record<string, Record<Locale, L>> = {
  // ---- dashboard ----
  "dashboard.view": {
    zh: { name: "查看首页看板", desc: "打开首页的实时预警看板" },
    en: { name: "View dashboard", desc: "Open the home dashboard with live alert tiles" },
    "es-MX": { name: "Ver panel", desc: "Abrir el panel de inicio con alertas en vivo" },
  },

  // ---- sales ----
  "sales.orders.read": {
    zh: { name: "查看销售订单", desc: "浏览销售订单及其明细" },
    en: { name: "View sales orders", desc: "Browse sales orders and their lines" },
    "es-MX": { name: "Ver pedidos de venta", desc: "Consultar pedidos de venta y sus líneas" },
  },
  "sales.orders.write": {
    zh: { name: "编辑销售订单", desc: "新建、修改并确认销售订单" },
    en: { name: "Create / edit sales orders", desc: "Create, edit and confirm sales orders" },
    "es-MX": { name: "Crear / editar pedidos", desc: "Crear, editar y confirmar pedidos de venta" },
  },
  "sales.approvals.write": {
    zh: { name: "审批毛利 / 信用", desc: "审批低毛利或超信用额度的订单放行" },
    en: { name: "Approve margin / credit", desc: "Approve low-margin or over-credit orders" },
    "es-MX": { name: "Aprobar margen / crédito", desc: "Aprobar pedidos de bajo margen o sobre crédito" },
  },
  "sales.approvals.read": {
    zh: { name: "查看审批记录", desc: "查看毛利与信用审批的历史记录" },
    en: { name: "View approvals", desc: "See margin and credit approval history" },
    "es-MX": { name: "Ver aprobaciones", desc: "Ver el historial de aprobaciones de margen y crédito" },
  },
  "sales.history.read": {
    zh: { name: "订单历史与追溯", desc: "查询历史订单与批次双向追溯" },
    en: { name: "Order history & trace", desc: "Look up order history and batch traceability" },
    "es-MX": { name: "Historial y trazabilidad", desc: "Consultar historial de pedidos y trazabilidad de lotes" },
  },

  // ---- account (customers & credit) ----
  "account.customers.read": {
    zh: { name: "查看客户档案", desc: "浏览客户资料、联系人与收货地址" },
    en: { name: "View customers", desc: "Browse customer profiles, contacts and delivery addresses" },
    "es-MX": { name: "Ver clientes", desc: "Consultar perfiles, contactos y direcciones de entrega" },
  },
  "account.customers.write": {
    zh: { name: "编辑客户档案", desc: "新增或修改客户、联系人、地址" },
    en: { name: "Edit customers", desc: "Create or edit customers, contacts and addresses" },
    "es-MX": { name: "Editar clientes", desc: "Crear o editar clientes, contactos y direcciones" },
  },
  "account.credit.read": {
    zh: { name: "查看客户信用", desc: "查看客户的信用额度与已用额度（信用占用）" },
    en: { name: "View customer credit", desc: "See each customer's credit limit and current exposure" },
    "es-MX": { name: "Ver crédito del cliente", desc: "Ver el límite y la exposición de crédito de cada cliente" },
  },

  // ---- warehouse ----
  "warehouse.stock.read": {
    zh: { name: "查看库存", desc: "查看库存、批次与可用量（ATP）" },
    en: { name: "View stock", desc: "See stock, batches and available-to-promise (ATP)" },
    "es-MX": { name: "Ver existencias", desc: "Ver existencias, lotes y disponibilidad (ATP)" },
  },
  "warehouse.stock.adjust": {
    zh: { name: "库存调整", desc: "创建库存调整单（ADJ），差异必须留原因" },
    en: { name: "Adjust inventory", desc: "Create inventory adjustments (ADJ); every change needs a reason" },
    "es-MX": { name: "Ajustar inventario", desc: "Crear ajustes de inventario (ADJ); cada cambio requiere motivo" },
  },
  "warehouse.inventory.read": {
    zh: { name: "查看盘点与调整", desc: "查看循环盘点任务与库存调整记录" },
    en: { name: "View counts & adjustments", desc: "See cycle-count tasks and inventory adjustment records" },
    "es-MX": { name: "Ver conteos y ajustes", desc: "Ver tareas de conteo cíclico y registros de ajuste" },
  },
  "warehouse.replenishment.write": {
    zh: { name: "FEFO 补货", desc: "按先到期先出（FEFO）把货补到拣货位" },
    en: { name: "FEFO replenishment", desc: "Replenish pick faces first-expiry-first-out" },
    "es-MX": { name: "Reabasto FEFO", desc: "Reabastecer posiciones de surtido por caducidad más próxima" },
  },
  "warehouse.locations.write": {
    zh: { name: "管理储位与周转筐", desc: "维护储位与周转筐主数据" },
    en: { name: "Manage locations & totes", desc: "Maintain storage locations and totes" },
    "es-MX": { name: "Gestionar ubicaciones", desc: "Mantener ubicaciones de almacenamiento y contenedores" },
  },
  "warehouse.routes.write": {
    zh: { name: "管理配送路线", desc: "维护路线、配送日与客户站点顺序" },
    en: { name: "Manage delivery routes", desc: "Maintain routes, delivery days and customer stop order" },
    "es-MX": { name: "Gestionar rutas de entrega", desc: "Mantener rutas, días de entrega y orden de paradas" },
  },
  "warehouse.picklists.read": {
    zh: { name: "查看拣货单", desc: "查看拣货单与拣货明细" },
    en: { name: "View pick lists", desc: "See pick lists and pick lines" },
    "es-MX": { name: "Ver listas de surtido", desc: "Ver listas de surtido y sus líneas" },
  },
  "warehouse.picklists.write": {
    zh: { name: "生成拣货单", desc: "生成或撤回拣货单" },
    en: { name: "Generate pick lists", desc: "Generate or withdraw pick lists" },
    "es-MX": { name: "Generar listas de surtido", desc: "Generar o retirar listas de surtido" },
  },
  "warehouse.picking.write": {
    zh: { name: "拣货（第一步）", desc: "两步拣货第一步：按拣货单拣货" },
    en: { name: "Pick (step 1)", desc: "Two-step picking, step 1: pick against the pick list" },
    "es-MX": { name: "Surtir (paso 1)", desc: "Surtido en dos pasos, paso 1: surtir según la lista" },
  },
  "warehouse.weighing.write": {
    zh: { name: "称重（第二步）", desc: "两步拣货第二步：称重并录入实重" },
    en: { name: "Weigh (step 2)", desc: "Two-step picking, step 2: weigh and record actual weight" },
    "es-MX": { name: "Pesar (paso 2)", desc: "Surtido en dos pasos, paso 2: pesar y registrar el peso real" },
  },
  "warehouse.shipping.read": {
    zh: { name: "查看发运单", desc: "查看发运单与发运明细" },
    en: { name: "View shipping", desc: "See shipping lists and lines" },
    "es-MX": { name: "Ver envíos", desc: "Ver listas de envío y sus líneas" },
  },
  "warehouse.shipping.write": {
    zh: { name: "发运与签收", desc: "装车放行、发运并采集签收凭证（POD）" },
    en: { name: "Shipping & POD", desc: "Release, ship and capture proof-of-delivery" },
    "es-MX": { name: "Envío y POD", desc: "Liberar, enviar y capturar prueba de entrega" },
  },
  "warehouse.trips.read": {
    zh: { name: "查看配送趟次", desc: "查看配送趟次与司机任务" },
    en: { name: "View delivery trips", desc: "See delivery trips and driver assignments" },
    "es-MX": { name: "Ver viajes de entrega", desc: "Ver viajes de entrega y asignaciones de chofer" },
  },
  "warehouse.returns.read": {
    zh: { name: "查看退货单", desc: "查看退货单与退货明细" },
    en: { name: "View returns", desc: "See return notes and return lines" },
    "es-MX": { name: "Ver devoluciones", desc: "Ver notas de devolución y sus líneas" },
  },
  "warehouse.returns.write": {
    zh: { name: "处理退货", desc: "退货收货、隔离与处置" },
    en: { name: "Handle returns", desc: "Return collection, quarantine and disposition" },
    "es-MX": { name: "Gestionar devoluciones", desc: "Recolección, cuarentena y disposición de devoluciones" },
  },
  "warehouse.repack.read": {
    zh: { name: "查看分装单", desc: "查看分装单与产出批次" },
    en: { name: "View repack orders", desc: "See repack orders and output batches" },
    "es-MX": { name: "Ver reempaques", desc: "Ver órdenes de reempaque y lotes resultantes" },
  },
  "warehouse.repack.write": {
    zh: { name: "执行分装", desc: "创建分装单并登记产出批次（含父子批次追溯）" },
    en: { name: "Repack", desc: "Create repack orders and record output batches (with lineage)" },
    "es-MX": { name: "Reempacar", desc: "Crear órdenes de reempaque y registrar lotes resultantes" },
  },

  // ---- purchasing & receiving ----
  "purchasing.po.read": {
    zh: { name: "查看采购订单", desc: "浏览采购订单及其明细" },
    en: { name: "View purchase orders", desc: "Browse purchase orders and their lines" },
    "es-MX": { name: "Ver órdenes de compra", desc: "Consultar órdenes de compra y sus líneas" },
  },
  "purchasing.po.write": {
    zh: { name: "编辑采购订单", desc: "新建、修改并下达采购订单" },
    en: { name: "Create / edit purchase orders", desc: "Create, edit and issue purchase orders" },
    "es-MX": { name: "Crear / editar órdenes de compra", desc: "Crear, editar y emitir órdenes de compra" },
  },
  "purchasing.receiving.read": {
    zh: { name: "查看收货单", desc: "查看收货单、送货单、发票与三单核对" },
    en: { name: "View goods receipts", desc: "See goods receipts, delivery notes, invoices and 3-way match" },
    "es-MX": { name: "Ver recepciones", desc: "Ver recepciones, notas de entrega, facturas y cotejo triple" },
  },
  "purchasing.receiving.write": {
    zh: { name: "盲收与三单核对", desc: "盲收入库、录送货单/发票并做三单核对" },
    en: { name: "Receive goods", desc: "Blind-receive stock, enter delivery notes/invoices, run 3-way match" },
    "es-MX": { name: "Recibir mercancía", desc: "Recepción a ciegas, capturar notas/facturas y cotejo triple" },
  },
  "purchasing.pricing.read": {
    zh: { name: "查看价格与提醒", desc: "查看价格历史与成本上涨提醒" },
    en: { name: "View pricing & alerts", desc: "See price history and cost-increase alerts" },
    "es-MX": { name: "Ver precios y alertas", desc: "Ver historial de precios y alertas de aumento de costo" },
  },
  "purchasing.price_alerts.write": {
    zh: { name: "处理调价提醒", desc: "处理进货成本上涨提醒并调整售价" },
    en: { name: "Handle price alerts", desc: "Handle cost-increase alerts and reprice" },
    "es-MX": { name: "Gestionar alertas de precio", desc: "Atender alertas de aumento de costo y reajustar precios" },
  },
  "purchasing.suppliers.write": {
    zh: { name: "管理供应商", desc: "新增或修改供应商主数据" },
    en: { name: "Manage suppliers", desc: "Create or edit supplier records" },
    "es-MX": { name: "Gestionar proveedores", desc: "Crear o editar registros de proveedores" },
  },

  // ---- finance ----
  "finance.billing.read": {
    zh: { name: "查看开票队列", desc: "查看待开票与贷项通知队列" },
    en: { name: "View billing queues", desc: "See billing and credit-note queues" },
    "es-MX": { name: "Ver colas de facturación", desc: "Ver colas de facturación y notas de crédito" },
  },
  "finance.adjustments.read": {
    zh: { name: "查看配送调整", desc: "查看短送、超送、重量修正等配送财务调整" },
    en: { name: "View delivery adjustments", desc: "See delivery financial adjustments (short/over-ship, weight fixes)" },
    "es-MX": { name: "Ver ajustes de entrega", desc: "Ver ajustes financieros de entrega (faltantes, excedentes, peso)" },
  },
  "finance.credit_control.write": {
    zh: { name: "管理信用状态", desc: "冻结或解冻客户信用（停单 / 放单）" },
    en: { name: "Manage credit status", desc: "Block or unblock customer credit status" },
    "es-MX": { name: "Gestionar estado de crédito", desc: "Bloquear o desbloquear el estado de crédito del cliente" },
  },

  // ---- master data ----
  "master.products.write": {
    zh: { name: "管理商品主数据", desc: "维护商品、原产品、分类、包装与价格" },
    en: { name: "Manage products", desc: "Maintain products, families, categories, packaging and prices" },
    "es-MX": { name: "Gestionar productos", desc: "Mantener productos, familias, categorías, empaques y precios" },
  },

  // ---- it & admin ----
  "master.settings.write": {
    zh: { name: "修改系统设置", desc: "调整毛利、成本、信用、称重等护栏阈值" },
    en: { name: "Edit system settings", desc: "Adjust guardrail thresholds (margin, cost, credit, weighing)" },
    "es-MX": { name: "Editar configuración", desc: "Ajustar umbrales de control (margen, costo, crédito, pesaje)" },
  },
  "it.users.manage": {
    zh: { name: "管理用户与角色", desc: "邀请建号、修改角色、启用/停用、重置密码" },
    en: { name: "Manage users & roles", desc: "Invite users, change roles, activate/deactivate, reset passwords" },
    "es-MX": { name: "Gestionar usuarios y roles", desc: "Invitar usuarios, cambiar roles, activar/desactivar, restablecer contraseñas" },
  },
  "it.permissions.manage": {
    zh: { name: "配置功能权限", desc: "为角色或单个用户分配、覆盖功能权限" },
    en: { name: "Manage feature permissions", desc: "Assign and override feature permissions for roles and users" },
    "es-MX": { name: "Gestionar permisos", desc: "Asignar y anular permisos de función para roles y usuarios" },
  },
  "audit.log.read": {
    zh: { name: "查看操作日志", desc: "追溯系统增删改留痕——谁在何时改了什么" },
    en: { name: "View audit log", desc: "Trace create/update/delete history — who changed what and when" },
    "es-MX": { name: "Ver registro de auditoría", desc: "Rastrear el historial de cambios: quién cambió qué y cuándo" },
  },
};

const FALLBACK: Locale = "zh";

/** 取权限点的本地化名称与说明；缺失则回退到 key 本身。 */
export function permissionLabel(key: string, locale: Locale): L {
  const entry = PERMISSION_LABELS[key];
  if (entry) return entry[locale] ?? entry[FALLBACK];
  return { name: key, desc: "" };
}

/** 取模块的本地化名称；缺失则回退到大写代码。 */
export function moduleLabel(module: string, locale: Locale): string {
  const entry = MODULE_LABELS[module];
  return entry?.[locale] ?? entry?.[FALLBACK] ?? module.toUpperCase();
}

/** 模块排序权重（用于按业务流顺序分组展示）。 */
export function moduleRank(module: string): number {
  const i = (MODULE_ORDER as readonly string[]).indexOf(module);
  return i === -1 ? 999 : i;
}
