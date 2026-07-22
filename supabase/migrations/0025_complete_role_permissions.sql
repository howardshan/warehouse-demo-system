-- ============================================================
-- Migration: 0025_complete_role_permissions.sql
-- 目的:   为用户管理可选的全部 app_role 补齐默认功能权限；
--          含 0024 新增的 warehouse.stock.adjust / audit.log.read。
-- 关联文档: /docs/modules/01-master-data.md
-- 回滚:   按角色手工回退 role_permissions
-- ============================================================

-- 确保新权限存在
insert into permissions (key, module, description) values
  ('warehouse.stock.adjust', 'warehouse', 'Create inventory adjustments (ADJ)'),
  ('audit.log.read', 'it', 'View system audit / operation log')
on conflict (key) do nothing;

-- 重建非 admin 角色默认权限（admin 始终全量）
delete from role_permissions where role <> 'admin';

insert into role_permissions (role, permission_key)
select 'admin'::app_role, key from permissions
on conflict do nothing;

insert into role_permissions (role, permission_key) values
  -- IT
  ('it', 'dashboard.view'),
  ('it', 'master.products.write'),
  ('it', 'master.settings.write'),
  ('it', 'it.users.manage'),
  ('it', 'it.permissions.manage'),
  ('it', 'audit.log.read'),

  -- 采购
  ('purchasing', 'dashboard.view'),
  ('purchasing', 'purchasing.po.read'),
  ('purchasing', 'purchasing.po.write'),
  ('purchasing', 'purchasing.receiving.write'),
  ('purchasing', 'purchasing.price_alerts.write'),
  ('purchasing', 'purchasing.suppliers.write'),
  ('purchasing', 'master.products.write'),
  ('purchasing', 'warehouse.stock.read'),
  ('purchasing', 'audit.log.read'),

  -- 仓库
  ('warehouse', 'dashboard.view'),
  ('warehouse', 'warehouse.stock.read'),
  ('warehouse', 'warehouse.stock.adjust'),
  ('warehouse', 'warehouse.replenishment.write'),
  ('warehouse', 'warehouse.picklists.write'),
  ('warehouse', 'warehouse.picking.write'),
  ('warehouse', 'warehouse.weighing.write'),
  ('warehouse', 'warehouse.shipping.write'),
  ('warehouse', 'warehouse.returns.write'),
  ('warehouse', 'warehouse.repack.write'),
  ('warehouse', 'warehouse.locations.write'),
  ('warehouse', 'audit.log.read'),

  -- 销售
  ('sales', 'dashboard.view'),
  ('sales', 'sales.orders.read'),
  ('sales', 'sales.orders.write'),
  ('sales', 'sales.history.read'),
  ('sales', 'account.customers.read'),
  ('sales', 'account.customers.write'),

  -- 销售经理
  ('sales_manager', 'dashboard.view'),
  ('sales_manager', 'sales.orders.read'),
  ('sales_manager', 'sales.orders.write'),
  ('sales_manager', 'sales.approvals.write'),
  ('sales_manager', 'sales.history.read'),
  ('sales_manager', 'account.customers.read'),
  ('sales_manager', 'account.customers.write'),
  ('sales_manager', 'account.credit.read'),
  ('sales_manager', 'master.products.write'),
  ('sales_manager', 'audit.log.read'),

  -- 账户
  ('account', 'dashboard.view'),
  ('account', 'account.customers.read'),
  ('account', 'account.customers.write'),
  ('account', 'account.credit.read'),
  ('account', 'finance.billing.read'),

  -- 财务
  ('finance', 'dashboard.view'),
  ('finance', 'finance.billing.read'),
  ('finance', 'finance.credit_control.write'),
  ('finance', 'account.customers.read'),
  ('finance', 'account.credit.read'),
  ('finance', 'sales.history.read'),
  ('finance', 'audit.log.read'),

  -- 司机
  ('driver', 'dashboard.view'),
  ('driver', 'warehouse.shipping.write'),
  ('driver', 'warehouse.returns.write')
on conflict do nothing;
