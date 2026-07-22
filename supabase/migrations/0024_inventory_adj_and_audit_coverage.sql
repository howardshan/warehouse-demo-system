-- ============================================================
-- Migration: 0024_inventory_adj_and_audit_coverage.sql
-- 守护铁律: 铁律 14（差异必有原因）；全链路修改留痕
-- 目的:   库存调整(ADJ)表；扩大 audit_log 触发器覆盖；审计查看权限
-- 关联文档: /docs/modules/03-inventory-locations.md
-- 回滚:   drop table inventory_adjustments; drop triggers; delete permissions
-- ============================================================

-- ── 库存调整单据 ────────────────────────────────────────────
create table inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid references stock(id),
  product_id uuid not null references products(id),
  location_id uuid not null references locations(id),
  batch_id uuid not null references batches(id),
  before_units numeric not null check (before_units >= 0),
  before_weight_lb numeric not null check (before_weight_lb >= 0),
  after_units numeric not null check (after_units >= 0),
  after_weight_lb numeric not null check (after_weight_lb >= 0),
  variance_reason variance_reason not null,
  notes text,
  created_by uuid default auth.uid() references user_profiles(id),
  created_at timestamptz not null default now(),
  constraint inventory_adj_must_change check (
    before_units is distinct from after_units
    or before_weight_lb is distinct from after_weight_lb
  )
);

create index idx_inventory_adj_created on inventory_adjustments (created_at desc);
create index idx_inventory_adj_product on inventory_adjustments (product_id, created_at desc);
create index idx_inventory_adj_stock on inventory_adjustments (stock_id);

alter table inventory_adjustments enable row level security;

create policy inventory_adj_select on inventory_adjustments
  for select to authenticated using (true);

create policy inventory_adj_write on inventory_adjustments
  for all to authenticated
  using (public.has_role(array['admin', 'warehouse']::app_role[]))
  with check (public.has_role(array['admin', 'warehouse']::app_role[]));

-- ── 审计触发器扩覆盖（创建 / 修改 / 删除一律留痕）────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'stock',
    'batches',
    'goods_receipts',
    'gr_lines',
    'purchase_orders',
    'po_lines',
    'replenishment_tasks',
    'cycle_count_tasks',
    'inventory_counts',
    'inventory_adjustments',
    'suppliers',
    'locations',
    'totes',
    'product_families',
    'settings',
    'user_profiles',
    'user_permissions'
  ]
  loop
    execute format(
      'drop trigger if exists trg_audit_%I on %I',
      t, t
    );
    execute format(
      'create trigger trg_audit_%I
         after insert or update or delete on %I
         for each row execute function public.fn_audit_row()',
      t, t
    );
  end loop;
end $$;

-- ── 权限 ────────────────────────────────────────────────────
insert into permissions (key, module, description) values
  ('warehouse.stock.adjust', 'warehouse', 'Create inventory adjustments (ADJ)'),
  ('audit.log.read', 'it', 'View system audit / operation log')
on conflict (key) do nothing;

insert into role_permissions (role, permission_key) values
  ('admin', 'warehouse.stock.adjust'),
  ('admin', 'audit.log.read'),
  ('warehouse', 'warehouse.stock.adjust'),
  ('warehouse', 'audit.log.read'),
  ('it', 'audit.log.read'),
  ('finance', 'audit.log.read'),
  ('sales_manager', 'audit.log.read'),
  ('purchasing', 'audit.log.read')
on conflict do nothing;

-- 审计日志可读：角色或显式权限
drop policy if exists audit_log_select on audit_log;
create policy audit_log_select on audit_log for select to authenticated
  using (
    public.has_role(array['admin', 'finance', 'sales_manager', 'it']::app_role[])
    or public.user_has_permission('audit.log.read')
  );
