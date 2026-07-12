-- ============================================================
-- Migration: 0008_rls.sql
-- 守护铁律: 铁律 5, 6（信用状态只有 finance 可写）
-- 目的:   全表启用 RLS,并落地关键写策略。销售不能 block 客户;
--          改价仅 purchasing / sales_manager / admin。
-- 关联文档: /docs/schema/rls.md
-- 关联 ADR: /docs/decisions/0004-credit-includes-signed-uninvoiced.md
-- 回滚:   drop policy ...; alter table ... disable row level security;
-- ============================================================

-- ── 启用 RLS ──────────────────────────────────────────────
alter table user_profiles enable row level security;
alter table suppliers enable row level security;
alter table locations enable row level security;
alter table totes enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table customer_contacts enable row level security;
alter table customer_addresses enable row level security;
alter table credit_checks enable row level security;
alter table settings enable row level security;
alter table audit_log enable row level security;

-- ── user_profiles ─────────────────────────────────────────
create policy user_profiles_select_authenticated
  on user_profiles for select to authenticated
  using (true);

create policy user_profiles_update_self_or_admin
  on user_profiles for update to authenticated
  using (id = auth.uid() or public.has_role(array['admin']::app_role[]))
  with check (
    -- 普通用户不能改自己的 role
    (
      id = auth.uid()
      and role = (select role from user_profiles where id = auth.uid())
    )
    or public.has_role(array['admin']::app_role[])
  );

create policy user_profiles_insert_admin
  on user_profiles for insert to authenticated
  with check (public.has_role(array['admin']::app_role[]));

-- ── suppliers ─────────────────────────────────────────────
create policy suppliers_select on suppliers for select to authenticated using (true);
create policy suppliers_write on suppliers for all to authenticated
  using (public.has_role(array['admin', 'purchasing']::app_role[]))
  with check (public.has_role(array['admin', 'purchasing']::app_role[]));

-- ── locations ─────────────────────────────────────────────
create policy locations_select on locations for select to authenticated using (true);
create policy locations_write on locations for all to authenticated
  using (public.has_role(array['admin', 'warehouse', 'purchasing']::app_role[]))
  with check (public.has_role(array['admin', 'warehouse', 'purchasing']::app_role[]));

-- ── totes ─────────────────────────────────────────────────
create policy totes_select on totes for select to authenticated using (true);
create policy totes_write on totes for all to authenticated
  using (public.has_role(array['admin', 'warehouse']::app_role[]))
  with check (public.has_role(array['admin', 'warehouse']::app_role[]));

-- ── products ──────────────────────────────────────────────
create policy products_select on products for select to authenticated using (true);

create policy products_insert on products for insert to authenticated
  with check (public.has_role(array['admin', 'purchasing']::app_role[]));

-- 改价仅 purchasing / sales_manager / admin
create policy products_update on products for update to authenticated
  using (public.has_role(array['admin', 'purchasing', 'sales_manager']::app_role[]))
  with check (public.has_role(array['admin', 'purchasing', 'sales_manager']::app_role[]));

create policy products_delete on products for delete to authenticated
  using (public.has_role(array['admin', 'purchasing']::app_role[]));

-- ── customers ─────────────────────────────────────────────
create policy customers_select on customers for select to authenticated
  using (
    public.has_role(array['admin', 'finance', 'sales_manager', 'purchasing', 'warehouse']::app_role[])
    or (
      public.has_role(array['sales']::app_role[])
      and (default_sales_rep = auth.uid() or default_sales_rep is null)
    )
    or public.has_role(array['driver']::app_role[])
  );

create policy customers_insert on customers for insert to authenticated
  with check (public.has_role(array['admin', 'finance', 'sales_manager']::app_role[]));

-- 更新允许 sales_manager/admin/finance;信用字段另有触发器护栏
create policy customers_update on customers for update to authenticated
  using (public.has_role(array['admin', 'finance', 'sales_manager']::app_role[]))
  with check (public.has_role(array['admin', 'finance', 'sales_manager']::app_role[]));

create policy customers_delete on customers for delete to authenticated
  using (public.has_role(array['admin']::app_role[]));

-- ── customer_contacts / addresses ─────────────────────────
create policy customer_contacts_select on customer_contacts for select to authenticated using (true);
create policy customer_contacts_write on customer_contacts for all to authenticated
  using (public.has_role(array['admin', 'finance', 'sales_manager', 'sales']::app_role[]))
  with check (public.has_role(array['admin', 'finance', 'sales_manager', 'sales']::app_role[]));

create policy customer_addresses_select on customer_addresses for select to authenticated using (true);
create policy customer_addresses_write on customer_addresses for all to authenticated
  using (public.has_role(array['admin', 'finance', 'sales_manager', 'sales']::app_role[]))
  with check (public.has_role(array['admin', 'finance', 'sales_manager', 'sales']::app_role[]));

-- ── credit_checks ─────────────────────────────────────────
create policy credit_checks_select on credit_checks for select to authenticated
  using (public.has_role(array['admin', 'finance', 'sales_manager']::app_role[]));

create policy credit_checks_insert on credit_checks for insert to authenticated
  with check (public.has_role(array['admin', 'finance', 'sales', 'sales_manager', 'warehouse']::app_role[]));

-- ── settings ──────────────────────────────────────────────
create policy settings_select on settings for select to authenticated using (true);
create policy settings_write on settings for all to authenticated
  using (public.has_role(array['admin']::app_role[]))
  with check (public.has_role(array['admin']::app_role[]));

-- ── audit_log ─────────────────────────────────────────────
create policy audit_log_select on audit_log for select to authenticated
  using (public.has_role(array['admin', 'finance', 'sales_manager']::app_role[]));

-- insert 由 security definer 触发器写入,不开放直写
