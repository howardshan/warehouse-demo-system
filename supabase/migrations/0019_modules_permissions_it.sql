-- ============================================================
-- Migration: 0019_modules_permissions_it.sql
-- 守护铁律: —
-- 目的:   模块化权限：采购 / 仓库 / 销售 / 账户 / 财务 / IT。
--          IT 角色管理用户与功能权限；admin 拥有全部。
-- 关联文档: /docs/modules/01-master-data.md
-- 关联 ADR: —
-- 回滚:   drop table user_permissions, role_permissions, permissions;
--          -- enum 值不可轻易删除
-- ============================================================

create table permissions (
  key          text primary key,
  module       text not null
               check (module in (
                 'dashboard', 'purchasing', 'warehouse', 'sales',
                 'account', 'finance', 'it', 'master'
               )),
  description  text not null,
  created_at   timestamptz not null default now()
);

create table role_permissions (
  role           app_role not null,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role, permission_key)
);

-- 用户级覆盖：grant=true 额外授予；grant=false 显式收回（即使角色有）
create table user_permissions (
  user_id        uuid not null references user_profiles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  granted        boolean not null default true,
  updated_by     uuid references user_profiles(id),
  updated_at     timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create index idx_user_permissions_user on user_permissions (user_id);
create index idx_role_permissions_role on role_permissions (role);

insert into permissions (key, module, description) values
  ('dashboard.view', 'dashboard', 'View home dashboard'),

  ('purchasing.po.read', 'purchasing', 'View purchase orders'),
  ('purchasing.po.write', 'purchasing', 'Create/edit purchase orders'),
  ('purchasing.receiving.write', 'purchasing', 'Blind receiving'),
  ('purchasing.price_alerts.write', 'purchasing', 'Handle cost alerts / reprice'),
  ('purchasing.suppliers.write', 'purchasing', 'Manage suppliers'),

  ('warehouse.stock.read', 'warehouse', 'View stock / batches / ATP'),
  ('warehouse.replenishment.write', 'warehouse', 'FEFO replenishment'),
  ('warehouse.picklists.write', 'warehouse', 'Generate / withdraw pick lists'),
  ('warehouse.picking.write', 'warehouse', 'Pick step 1'),
  ('warehouse.weighing.write', 'warehouse', 'Weigh step 2'),
  ('warehouse.shipping.write', 'warehouse', 'Shipping release / POD'),
  ('warehouse.returns.write', 'warehouse', 'Returns collection / disposition'),
  ('warehouse.repack.write', 'warehouse', 'Repack orders'),
  ('warehouse.locations.write', 'warehouse', 'Manage locations / totes'),

  ('sales.orders.read', 'sales', 'View sales orders'),
  ('sales.orders.write', 'sales', 'Create/edit sales orders'),
  ('sales.approvals.write', 'sales', 'Approve low-margin orders'),
  ('sales.history.read', 'sales', 'Order / batch history & trace'),

  ('account.customers.read', 'account', 'View customers'),
  ('account.customers.write', 'account', 'Edit customers / addresses'),
  ('account.credit.read', 'account', 'View credit exposure'),

  ('finance.billing.read', 'finance', 'Billing / credit-note queues'),
  ('finance.credit_control.write', 'finance', 'Block / unblock credit status'),

  ('master.products.write', 'master', 'Manage products'),
  ('master.settings.write', 'it', 'System settings'),

  ('it.users.manage', 'it', 'Manage users and roles'),
  ('it.permissions.manage', 'it', 'Assign feature permissions');

-- 角色默认权限
insert into role_permissions (role, permission_key)
select 'admin'::app_role, key from permissions;

insert into role_permissions (role, permission_key)
select 'it'::app_role, key from permissions
where module in ('it', 'dashboard', 'master') or key = 'master.settings.write';

insert into role_permissions (role, permission_key) values
  ('purchasing', 'dashboard.view'),
  ('purchasing', 'purchasing.po.read'),
  ('purchasing', 'purchasing.po.write'),
  ('purchasing', 'purchasing.receiving.write'),
  ('purchasing', 'purchasing.price_alerts.write'),
  ('purchasing', 'purchasing.suppliers.write'),
  ('purchasing', 'master.products.write'),
  ('purchasing', 'warehouse.stock.read'),

  ('warehouse', 'dashboard.view'),
  ('warehouse', 'warehouse.stock.read'),
  ('warehouse', 'warehouse.replenishment.write'),
  ('warehouse', 'warehouse.picklists.write'),
  ('warehouse', 'warehouse.picking.write'),
  ('warehouse', 'warehouse.weighing.write'),
  ('warehouse', 'warehouse.shipping.write'),
  ('warehouse', 'warehouse.returns.write'),
  ('warehouse', 'warehouse.repack.write'),
  ('warehouse', 'warehouse.locations.write'),

  ('sales', 'dashboard.view'),
  ('sales', 'sales.orders.read'),
  ('sales', 'sales.orders.write'),
  ('sales', 'sales.history.read'),
  ('sales', 'account.customers.read'),
  ('sales', 'account.customers.write'),

  ('sales_manager', 'dashboard.view'),
  ('sales_manager', 'sales.orders.read'),
  ('sales_manager', 'sales.orders.write'),
  ('sales_manager', 'sales.approvals.write'),
  ('sales_manager', 'sales.history.read'),
  ('sales_manager', 'account.customers.read'),
  ('sales_manager', 'account.customers.write'),
  ('sales_manager', 'account.credit.read'),
  ('sales_manager', 'master.products.write'),

  ('account', 'dashboard.view'),
  ('account', 'account.customers.read'),
  ('account', 'account.customers.write'),
  ('account', 'account.credit.read'),
  ('account', 'finance.billing.read'),

  ('finance', 'dashboard.view'),
  ('finance', 'finance.billing.read'),
  ('finance', 'finance.credit_control.write'),
  ('finance', 'account.customers.read'),
  ('finance', 'account.credit.read'),
  ('finance', 'sales.history.read'),

  ('driver', 'dashboard.view'),
  ('driver', 'warehouse.shipping.write'),
  ('driver', 'warehouse.returns.write');

create or replace function public.user_has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id, role from user_profiles
    where id = auth.uid() and is_active
  ),
  override as (
    select up.granted
    from user_permissions up
    join me on me.id = up.user_id
    where up.permission_key = p_key
  )
  select case
    when exists (select 1 from me where role = 'admin') then true
    when exists (select 1 from override) then (select granted from override)
    else exists (
      select 1 from role_permissions rp
      join me on me.role = rp.role
      where rp.permission_key = p_key
    )
  end;
$$;

create or replace function public.current_user_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct k), '{}')
  from (
    select p.key as k
    from permissions p
    where public.user_has_permission(p.key)
  ) s;
$$;

alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_permissions enable row level security;

create policy permissions_select on permissions for select to authenticated using (true);
create policy role_permissions_select on role_permissions for select to authenticated using (true);

create policy user_permissions_select on user_permissions for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(array['admin', 'it']::app_role[])
  );

create policy user_permissions_write on user_permissions for all to authenticated
  using (public.has_role(array['admin', 'it']::app_role[]))
  with check (public.has_role(array['admin', 'it']::app_role[]));

-- IT/admin 可更新任意用户角色
drop policy if exists user_profiles_update_self_or_admin on user_profiles;
create policy user_profiles_update_self_or_admin
  on user_profiles for update to authenticated
  using (
    id = auth.uid()
    or public.has_role(array['admin', 'it']::app_role[])
  )
  with check (
    public.has_role(array['admin', 'it']::app_role[])
    or (
      id = auth.uid()
      and role = (select role from user_profiles where id = auth.uid())
    )
  );

drop policy if exists user_profiles_insert_admin on user_profiles;
create policy user_profiles_insert_admin
  on user_profiles for insert to authenticated
  with check (public.has_role(array['admin', 'it']::app_role[]));

create policy role_permissions_write on role_permissions for all to authenticated
  using (public.has_role(array['admin', 'it']::app_role[]))
  with check (public.has_role(array['admin', 'it']::app_role[]));
