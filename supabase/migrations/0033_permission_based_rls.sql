-- ============================================================
-- Migration: 0033_permission_based_rls.sql
-- 守护铁律: 不破坏既有数据可见性/状态护栏（见 docs/decisions/0011）
-- 目的:   业务表 RLS 从「按角色 has_role」统一改为「按权限点 user_has_permission」，
--          实现细粒度授权：单账号在 /it/permissions 勾选即可端到端测试任意功能；
--          角色降级为「一键填充默认权限」的模板（role_permissions 保留旧行为）。
--          14 条含行级归属/状态的策略保留其额外护栏，仅替换 has_role 段。
-- 关联文档: /docs/decisions/0011-permission-based-rls.md
-- 关联 ADR: 0011
-- 回滚:   见 0011 附回滚说明（重建 has_role 版策略）。开发期可 db reset。
-- ============================================================

-- 1) 新增权限点
insert into permissions (key, module, description) values
  ('purchasing.receiving.read', 'purchasing', '查看收货单/收货明细'),
  ('purchasing.pricing.read', 'purchasing', '查看价格历史与调价提醒'),
  ('warehouse.picklists.read', 'warehouse', '查看拣货单/拣货明细'),
  ('warehouse.shipping.read', 'warehouse', '查看发运单/发运明细'),
  ('warehouse.returns.read', 'warehouse', '查看退货单/退货明细'),
  ('warehouse.trips.read', 'warehouse', '查看配送趟次'),
  ('warehouse.repack.read', 'warehouse', '查看分装单/产出'),
  ('warehouse.inventory.read', 'warehouse', '查看盘点任务与调整记录'),
  ('finance.adjustments.read', 'finance', '查看配送财务调整'),
  ('sales.approvals.read', 'sales', '查看毛利/信用审批记录')
on conflict (key) do nothing;

-- 2) 角色默认权限：把旧策略的角色授予对应权限点（幂等）
insert into role_permissions (role, permission_key) values
  ('finance'::app_role, 'audit.log.read'),
  ('sales_manager'::app_role, 'audit.log.read'),
  ('it'::app_role, 'audit.log.read'),
  ('purchasing'::app_role, 'warehouse.stock.adjust'),
  ('warehouse'::app_role, 'warehouse.stock.adjust'),
  ('finance'::app_role, 'account.credit.read'),
  ('sales'::app_role, 'account.credit.read'),
  ('sales_manager'::app_role, 'account.credit.read'),
  ('warehouse'::app_role, 'account.credit.read'),
  ('finance'::app_role, 'account.customers.write'),
  ('sales_manager'::app_role, 'account.customers.write'),
  ('sales'::app_role, 'account.customers.write'),
  ('finance'::app_role, 'account.customers.read'),
  ('sales_manager'::app_role, 'account.customers.read'),
  ('purchasing'::app_role, 'account.customers.read'),
  ('warehouse'::app_role, 'account.customers.read'),
  ('sales'::app_role, 'account.customers.read'),
  ('driver'::app_role, 'account.customers.read'),
  ('warehouse'::app_role, 'warehouse.inventory.read'),
  ('finance'::app_role, 'warehouse.inventory.read'),
  ('warehouse'::app_role, 'finance.adjustments.read'),
  ('sales_manager'::app_role, 'finance.adjustments.read'),
  ('finance'::app_role, 'finance.adjustments.read'),
  ('finance'::app_role, 'finance.credit_control.write'),
  ('warehouse'::app_role, 'warehouse.trips.read'),
  ('sales_manager'::app_role, 'warehouse.trips.read'),
  ('warehouse'::app_role, 'warehouse.shipping.write'),
  ('purchasing'::app_role, 'purchasing.receiving.read'),
  ('warehouse'::app_role, 'purchasing.receiving.read'),
  ('finance'::app_role, 'purchasing.receiving.read'),
  ('purchasing'::app_role, 'purchasing.receiving.write'),
  ('warehouse'::app_role, 'purchasing.receiving.write'),
  ('warehouse'::app_role, 'warehouse.locations.write'),
  ('purchasing'::app_role, 'warehouse.locations.write'),
  ('warehouse'::app_role, 'warehouse.picklists.read'),
  ('sales'::app_role, 'warehouse.picklists.read'),
  ('sales_manager'::app_role, 'warehouse.picklists.read'),
  ('finance'::app_role, 'warehouse.picklists.read'),
  ('driver'::app_role, 'warehouse.picklists.read'),
  ('warehouse'::app_role, 'warehouse.picking.write'),
  ('purchasing'::app_role, 'purchasing.po.read'),
  ('warehouse'::app_role, 'purchasing.po.read'),
  ('finance'::app_role, 'purchasing.po.read'),
  ('purchasing'::app_role, 'purchasing.po.write'),
  ('purchasing'::app_role, 'purchasing.pricing.read'),
  ('sales_manager'::app_role, 'purchasing.pricing.read'),
  ('finance'::app_role, 'purchasing.pricing.read'),
  ('purchasing'::app_role, 'purchasing.price_alerts.write'),
  ('sales_manager'::app_role, 'purchasing.price_alerts.write'),
  ('purchasing'::app_role, 'master.products.write'),
  ('it'::app_role, 'master.products.write'),
  ('sales_manager'::app_role, 'master.products.write'),
  ('warehouse'::app_role, 'warehouse.repack.read'),
  ('purchasing'::app_role, 'warehouse.repack.read'),
  ('finance'::app_role, 'warehouse.repack.read'),
  ('warehouse'::app_role, 'warehouse.repack.write'),
  ('warehouse'::app_role, 'warehouse.replenishment.write'),
  ('warehouse'::app_role, 'warehouse.returns.read'),
  ('sales'::app_role, 'warehouse.returns.read'),
  ('sales_manager'::app_role, 'warehouse.returns.read'),
  ('finance'::app_role, 'warehouse.returns.read'),
  ('driver'::app_role, 'warehouse.returns.read'),
  ('warehouse'::app_role, 'warehouse.returns.write'),
  ('sales_manager'::app_role, 'warehouse.returns.write'),
  ('sales'::app_role, 'warehouse.returns.write'),
  ('it'::app_role, 'it.permissions.manage'),
  ('sales_manager'::app_role, 'sales.orders.write'),
  ('sales'::app_role, 'sales.orders.write'),
  ('sales_manager'::app_role, 'sales.orders.read'),
  ('finance'::app_role, 'sales.orders.read'),
  ('warehouse'::app_role, 'sales.orders.read'),
  ('finance'::app_role, 'sales.orders.write'),
  ('warehouse'::app_role, 'sales.orders.write'),
  ('warehouse'::app_role, 'warehouse.shipping.read'),
  ('sales'::app_role, 'warehouse.shipping.read'),
  ('sales_manager'::app_role, 'warehouse.shipping.read'),
  ('finance'::app_role, 'warehouse.shipping.read'),
  ('finance'::app_role, 'warehouse.shipping.write'),
  ('sales'::app_role, 'sales.approvals.write'),
  ('sales_manager'::app_role, 'sales.approvals.write'),
  ('sales_manager'::app_role, 'sales.approvals.read'),
  ('finance'::app_role, 'sales.approvals.read'),
  ('finance'::app_role, 'sales.approvals.write'),
  ('purchasing'::app_role, 'purchasing.suppliers.write'),
  ('it'::app_role, 'it.users.manage')
on conflict (role, permission_key) do nothing;

-- 3) 重建业务表策略（drop + create，user_has_permission 版）
drop policy if exists audit_log_select on audit_log;
create policy audit_log_select on audit_log for select to authenticated
  using (public.user_has_permission('audit.log.read'));
drop policy if exists batches_write on batches;
create policy batches_write on batches for all to authenticated
  using (public.user_has_permission('warehouse.stock.adjust'))
  with check (public.user_has_permission('warehouse.stock.adjust'));
drop policy if exists credit_checks_insert on credit_checks;
create policy credit_checks_insert on credit_checks for insert to authenticated
  with check (public.user_has_permission('account.credit.read'));
drop policy if exists credit_checks_select on credit_checks;
create policy credit_checks_select on credit_checks for select to authenticated
  using (public.user_has_permission('account.credit.read'));
drop policy if exists customer_addresses_write on customer_addresses;
create policy customer_addresses_write on customer_addresses for all to authenticated
  using (public.user_has_permission('account.customers.write'))
  with check (public.user_has_permission('account.customers.write'));
drop policy if exists customer_contacts_write on customer_contacts;
create policy customer_contacts_write on customer_contacts for all to authenticated
  using (public.user_has_permission('account.customers.write'))
  with check (public.user_has_permission('account.customers.write'));
drop policy if exists customers_delete on customers;
create policy customers_delete on customers for delete to authenticated
  using (public.user_has_permission('account.customers.write'));
drop policy if exists customers_insert on customers;
create policy customers_insert on customers for insert to authenticated
  with check (public.user_has_permission('account.customers.write'));
drop policy if exists customers_select on customers;
create policy customers_select on customers for select to authenticated
  using (public.user_has_permission('account.customers.read') OR (public.user_has_permission('sales.orders.read') AND (default_sales_rep = auth.uid() OR default_sales_rep IS NULL)));
drop policy if exists customers_update on customers;
create policy customers_update on customers for update to authenticated
  using (public.user_has_permission('account.customers.write'))
  with check (public.user_has_permission('account.customers.write'));
drop policy if exists cycle_count_select on cycle_count_tasks;
create policy cycle_count_select on cycle_count_tasks for select to authenticated
  using (public.user_has_permission('warehouse.inventory.read'));
drop policy if exists cycle_count_write on cycle_count_tasks;
create policy cycle_count_write on cycle_count_tasks for all to authenticated
  using (public.user_has_permission('warehouse.stock.adjust'))
  with check (public.user_has_permission('warehouse.stock.adjust'));
drop policy if exists delivery_adjustments_select on delivery_adjustments;
create policy delivery_adjustments_select on delivery_adjustments for select to authenticated
  using (public.user_has_permission('finance.adjustments.read'));
drop policy if exists delivery_adjustments_write on delivery_adjustments;
create policy delivery_adjustments_write on delivery_adjustments for all to authenticated
  using (public.user_has_permission('finance.credit_control.write'))
  with check (public.user_has_permission('finance.credit_control.write'));
drop policy if exists delivery_trips_select on delivery_trips;
create policy delivery_trips_select on delivery_trips for select to authenticated
  using (driver_id = auth.uid() OR public.user_has_permission('warehouse.trips.read'));
drop policy if exists delivery_trips_write on delivery_trips;
create policy delivery_trips_write on delivery_trips for all to authenticated
  using (public.user_has_permission('warehouse.shipping.write'))
  with check (public.user_has_permission('warehouse.shipping.write'));
drop policy if exists doc_counters_select_admin on doc_counters;
create policy doc_counters_select_admin on doc_counters for select to authenticated
  using (public.user_has_permission('it.users.manage'));
drop policy if exists goods_receipts_select on goods_receipts;
create policy goods_receipts_select on goods_receipts for select to authenticated
  using (public.user_has_permission('purchasing.receiving.read'));
drop policy if exists goods_receipts_write on goods_receipts;
create policy goods_receipts_write on goods_receipts for all to authenticated
  using (public.user_has_permission('purchasing.receiving.write'))
  with check (public.user_has_permission('purchasing.receiving.write'));
drop policy if exists gr_lines_select on gr_lines;
create policy gr_lines_select on gr_lines for select to authenticated
  using (public.user_has_permission('purchasing.receiving.read'));
drop policy if exists gr_lines_write on gr_lines;
create policy gr_lines_write on gr_lines for all to authenticated
  using (public.user_has_permission('purchasing.receiving.write'))
  with check (public.user_has_permission('purchasing.receiving.write'));
drop policy if exists inventory_adj_write on inventory_adjustments;
create policy inventory_adj_write on inventory_adjustments for all to authenticated
  using (public.user_has_permission('warehouse.stock.adjust'))
  with check (public.user_has_permission('warehouse.stock.adjust'));
drop policy if exists inventory_counts_select on inventory_counts;
create policy inventory_counts_select on inventory_counts for select to authenticated
  using (public.user_has_permission('warehouse.inventory.read'));
drop policy if exists inventory_counts_write on inventory_counts;
create policy inventory_counts_write on inventory_counts for all to authenticated
  using (public.user_has_permission('warehouse.stock.adjust'))
  with check (public.user_has_permission('warehouse.stock.adjust'));
drop policy if exists locations_write on locations;
create policy locations_write on locations for all to authenticated
  using (public.user_has_permission('warehouse.locations.write'))
  with check (public.user_has_permission('warehouse.locations.write'));
drop policy if exists pick_list_lines_select on pick_list_lines;
create policy pick_list_lines_select on pick_list_lines for select to authenticated
  using (public.user_has_permission('warehouse.picklists.read'));
drop policy if exists pick_list_lines_write on pick_list_lines;
create policy pick_list_lines_write on pick_list_lines for all to authenticated
  using (public.user_has_permission('warehouse.picking.write'))
  with check (public.user_has_permission('warehouse.picking.write'));
drop policy if exists pick_lists_select on pick_lists;
create policy pick_lists_select on pick_lists for select to authenticated
  using (public.user_has_permission('warehouse.picklists.read'));
drop policy if exists pick_lists_write on pick_lists;
create policy pick_lists_write on pick_lists for all to authenticated
  using (public.user_has_permission('warehouse.picking.write'))
  with check (public.user_has_permission('warehouse.picking.write'));
drop policy if exists po_lines_select on po_lines;
create policy po_lines_select on po_lines for select to authenticated
  using (public.user_has_permission('purchasing.po.read'));
drop policy if exists po_lines_write on po_lines;
create policy po_lines_write on po_lines for all to authenticated
  using (public.user_has_permission('purchasing.po.write'))
  with check (public.user_has_permission('purchasing.po.write'));
drop policy if exists price_alerts_select on price_change_alerts;
create policy price_alerts_select on price_change_alerts for select to authenticated
  using (public.user_has_permission('purchasing.pricing.read'));
drop policy if exists price_alerts_update on price_change_alerts;
create policy price_alerts_update on price_change_alerts for update to authenticated
  using (public.user_has_permission('purchasing.price_alerts.write'))
  with check (public.user_has_permission('purchasing.price_alerts.write'));
drop policy if exists price_history_select on price_history;
create policy price_history_select on price_history for select to authenticated
  using (public.user_has_permission('purchasing.pricing.read'));
drop policy if exists product_categories_write on product_categories;
create policy product_categories_write on product_categories for all to authenticated
  using (public.user_has_permission('master.products.write'))
  with check (public.user_has_permission('master.products.write'));
drop policy if exists product_families_write on product_families;
create policy product_families_write on product_families for all to authenticated
  using (public.user_has_permission('master.products.write'))
  with check (public.user_has_permission('master.products.write'));
drop policy if exists products_delete on products;
create policy products_delete on products for delete to authenticated
  using (public.user_has_permission('master.products.write'));
drop policy if exists products_insert on products;
create policy products_insert on products for insert to authenticated
  with check (public.user_has_permission('master.products.write'));
drop policy if exists products_update on products;
create policy products_update on products for update to authenticated
  using (public.user_has_permission('master.products.write'))
  with check (public.user_has_permission('master.products.write'));
drop policy if exists purchase_orders_select on purchase_orders;
create policy purchase_orders_select on purchase_orders for select to authenticated
  using (public.user_has_permission('purchasing.po.read'));
drop policy if exists purchase_orders_write on purchase_orders;
create policy purchase_orders_write on purchase_orders for all to authenticated
  using (public.user_has_permission('purchasing.po.write'))
  with check (public.user_has_permission('purchasing.po.write'));
drop policy if exists repack_orders_select on repack_orders;
create policy repack_orders_select on repack_orders for select to authenticated
  using (public.user_has_permission('warehouse.repack.read'));
drop policy if exists repack_orders_write on repack_orders;
create policy repack_orders_write on repack_orders for all to authenticated
  using (public.user_has_permission('warehouse.repack.write'))
  with check (public.user_has_permission('warehouse.repack.write'));
drop policy if exists repack_outputs_select on repack_outputs;
create policy repack_outputs_select on repack_outputs for select to authenticated
  using (public.user_has_permission('warehouse.repack.read'));
drop policy if exists repack_outputs_write on repack_outputs;
create policy repack_outputs_write on repack_outputs for all to authenticated
  using (public.user_has_permission('warehouse.repack.write'))
  with check (public.user_has_permission('warehouse.repack.write'));
drop policy if exists replenishment_write on replenishment_tasks;
create policy replenishment_write on replenishment_tasks for all to authenticated
  using (public.user_has_permission('warehouse.replenishment.write'))
  with check (public.user_has_permission('warehouse.replenishment.write'));
drop policy if exists return_lines_select on return_lines;
create policy return_lines_select on return_lines for select to authenticated
  using (public.user_has_permission('warehouse.returns.read'));
drop policy if exists return_lines_write on return_lines;
create policy return_lines_write on return_lines for all to authenticated
  using (public.user_has_permission('warehouse.returns.write'))
  with check (public.user_has_permission('warehouse.returns.write'));
drop policy if exists return_notes_insert on return_notes;
create policy return_notes_insert on return_notes for insert to authenticated
  with check (public.user_has_permission('warehouse.returns.write'));
drop policy if exists return_notes_select on return_notes;
create policy return_notes_select on return_notes for select to authenticated
  using (EXISTS (SELECT 1 FROM delivery_trips dt WHERE dt.id = return_notes.delivery_trip_id AND dt.driver_id = auth.uid()) OR public.user_has_permission('warehouse.returns.read'));
drop policy if exists return_notes_update on return_notes;
create policy return_notes_update on return_notes for update to authenticated
  using (EXISTS (SELECT 1 FROM delivery_trips dt WHERE dt.id = return_notes.delivery_trip_id AND dt.driver_id = auth.uid()) OR public.user_has_permission('warehouse.returns.write'))
  with check (EXISTS (SELECT 1 FROM delivery_trips dt WHERE dt.id = return_notes.delivery_trip_id AND dt.driver_id = auth.uid()) OR public.user_has_permission('warehouse.returns.write'));
drop policy if exists role_permissions_write on role_permissions;
create policy role_permissions_write on role_permissions for all to authenticated
  using (public.user_has_permission('it.permissions.manage'))
  with check (public.user_has_permission('it.permissions.manage'));
drop policy if exists sales_orders_delete on sales_orders;
create policy sales_orders_delete on sales_orders for delete to authenticated
  using (status = 'draft'::so_status AND (sales_rep_id = auth.uid() OR public.user_has_permission('sales.orders.write')));
drop policy if exists sales_orders_insert on sales_orders;
create policy sales_orders_insert on sales_orders for insert to authenticated
  with check (public.user_has_permission('sales.orders.write'));
drop policy if exists sales_orders_select on sales_orders;
create policy sales_orders_select on sales_orders for select to authenticated
  using (sales_rep_id = auth.uid() OR public.user_has_permission('sales.orders.read'));
drop policy if exists sales_orders_update on sales_orders;
create policy sales_orders_update on sales_orders for update to authenticated
  using (sales_rep_id = auth.uid() OR public.user_has_permission('sales.orders.write'))
  with check (sales_rep_id = auth.uid() OR public.user_has_permission('sales.orders.write'));
drop policy if exists settings_write on settings;
create policy settings_write on settings for all to authenticated
  using (public.user_has_permission('master.settings.write'))
  with check (public.user_has_permission('master.settings.write'));
drop policy if exists shipping_lists_select on shipping_lists;
create policy shipping_lists_select on shipping_lists for select to authenticated
  using (driver_id = auth.uid() OR public.user_has_permission('warehouse.shipping.read'));
drop policy if exists shipping_lists_write on shipping_lists;
create policy shipping_lists_write on shipping_lists for all to authenticated
  using (public.user_has_permission('warehouse.shipping.write'))
  with check (public.user_has_permission('warehouse.shipping.write'));
drop policy if exists sl_lines_select on sl_lines;
create policy sl_lines_select on sl_lines for select to authenticated
  using (EXISTS (SELECT 1 FROM shipping_lists sl WHERE sl.id = sl_lines.shipping_list_id AND (sl.driver_id = auth.uid() OR public.user_has_permission('warehouse.shipping.read'))));
drop policy if exists sl_lines_write on sl_lines;
create policy sl_lines_write on sl_lines for all to authenticated
  using (public.user_has_permission('warehouse.shipping.write'))
  with check (public.user_has_permission('warehouse.shipping.write'));
drop policy if exists so_approvals_insert on so_approvals;
create policy so_approvals_insert on so_approvals for insert to authenticated
  with check (requested_by = auth.uid() AND public.user_has_permission('sales.approvals.write'));
drop policy if exists so_approvals_select on so_approvals;
create policy so_approvals_select on so_approvals for select to authenticated
  using (requested_by = auth.uid() OR public.user_has_permission('sales.approvals.read'));
drop policy if exists so_approvals_update on so_approvals;
create policy so_approvals_update on so_approvals for update to authenticated
  using (public.user_has_permission('sales.approvals.write'))
  with check (public.user_has_permission('sales.approvals.write'));
drop policy if exists so_lines_select on so_lines;
create policy so_lines_select on so_lines for select to authenticated
  using (EXISTS (SELECT 1 FROM sales_orders so WHERE so.id = so_lines.sales_order_id AND (so.sales_rep_id = auth.uid() OR public.user_has_permission('sales.orders.read'))));
drop policy if exists so_lines_write on so_lines;
create policy so_lines_write on so_lines for all to authenticated
  using (EXISTS (SELECT 1 FROM sales_orders so WHERE so.id = so_lines.sales_order_id AND (so.sales_rep_id = auth.uid() OR public.user_has_permission('sales.orders.write'))))
  with check (EXISTS (SELECT 1 FROM sales_orders so WHERE so.id = so_lines.sales_order_id AND (so.sales_rep_id = auth.uid() OR public.user_has_permission('sales.orders.write'))));
drop policy if exists stock_write on stock;
create policy stock_write on stock for all to authenticated
  using (public.user_has_permission('warehouse.stock.adjust'))
  with check (public.user_has_permission('warehouse.stock.adjust'));
drop policy if exists suppliers_write on suppliers;
create policy suppliers_write on suppliers for all to authenticated
  using (public.user_has_permission('purchasing.suppliers.write'))
  with check (public.user_has_permission('purchasing.suppliers.write'));
drop policy if exists totes_write on totes;
create policy totes_write on totes for all to authenticated
  using (public.user_has_permission('warehouse.locations.write'))
  with check (public.user_has_permission('warehouse.locations.write'));
drop policy if exists user_permissions_select on user_permissions;
create policy user_permissions_select on user_permissions for select to authenticated
  using (user_id = auth.uid() OR public.user_has_permission('it.permissions.manage'));
drop policy if exists user_permissions_write on user_permissions;
create policy user_permissions_write on user_permissions for all to authenticated
  using (public.user_has_permission('it.permissions.manage'))
  with check (public.user_has_permission('it.permissions.manage'));
drop policy if exists user_profiles_insert_admin on user_profiles;
create policy user_profiles_insert_admin on user_profiles for insert to authenticated
  with check (public.user_has_permission('it.users.manage'));
drop policy if exists user_profiles_update_self_or_admin on user_profiles;
create policy user_profiles_update_self_or_admin on user_profiles for update to authenticated
  using (id = auth.uid() OR public.user_has_permission('it.users.manage'))
  with check (public.user_has_permission('it.users.manage') OR (id = auth.uid() AND role = (SELECT role FROM public.user_profiles up WHERE up.id = auth.uid())));

