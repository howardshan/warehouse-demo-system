-- ============================================================
-- Migration: 0005_customers.sql
-- 守护铁律: 铁律 5, 6
-- 目的:   客户主档 + 信用字段 + 联系人/地址 + 信用检查日志。
--          credit_status 的写权限在 RLS 层限制为 finance(见 0008)。
--          Sales Permit 必须有有效期,否则免税凭证失控。
-- 关联文档: /docs/modules/10-customers-credit.md
-- 关联 ADR: /docs/decisions/0004-credit-includes-signed-uninvoiced.md
-- 回滚:   drop table credit_checks, customer_addresses, customer_contacts, customers;
-- ============================================================

create table customers (
  id                    uuid primary key default gen_random_uuid(),
  code                  text unique not null,
  name                  text not null,
  legal_name            text,
  tax_id                text,

  -- 信用 (铁律 5, 6)
  credit_limit          numeric not null default 0 check (credit_limit >= 0),
  payment_terms_days    int not null default 0 check (payment_terms_days >= 0),
  overdue_block_days    int not null default 60 check (overdue_block_days >= 0),
  credit_status         customer_credit_status not null default 'ok',
  credit_status_note    text,
  credit_status_by      uuid references user_profiles(id),
  credit_status_at      timestamptz,

  -- Sales Permit(免税凭证,不是普通附件)
  sales_permit_url      text,
  sales_permit_expiry   date,

  delivery_route        text,
  default_sales_rep     uuid references user_profiles(id),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint sales_permit_needs_expiry
    check (
      (sales_permit_url is null and sales_permit_expiry is null)
      or (sales_permit_url is not null and sales_permit_expiry is not null)
    )
);

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function public.handle_updated_at();

create table customer_contacts (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  role        text check (role is null or role in ('ordering', 'payment', 'receiving')),
  created_at  timestamptz not null default now()
);

create table customer_addresses (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references customers(id) on delete cascade,
  label           text,
  address         text not null,
  is_billing      boolean not null default false,
  is_default      boolean not null default false,
  delivery_window text,
  notes           text,
  created_at      timestamptz not null default now()
);

-- 每次信用检查都记日志,用于追溯「当时为什么放行」
create table credit_checks (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers(id),
  checkpoint    text not null check (checkpoint in ('so_confirm', 'shipping_release')),
  ref_type      text not null check (ref_type in ('sales_order', 'shipping_list')),
  ref_id        uuid not null,
  exposure      numeric not null,
  credit_limit  numeric not null,
  result        text not null check (result in ('pass', 'warning', 'blocked')),
  overridden_by uuid references user_profiles(id),
  created_at    timestamptz not null default now()
);

create index idx_customers_code on customers (code);
create index idx_customers_credit_status on customers (credit_status);
create index idx_customer_contacts_customer on customer_contacts (customer_id);
create index idx_customer_addresses_customer on customer_addresses (customer_id);
create index idx_credit_checks_customer on credit_checks (customer_id, created_at desc);

-- 铁律 5/6 护栏:只有 finance/admin 能改 credit_status
-- 应用层可绕过,所以用触发器在 DB 层再拦一道
create or replace function public.fn_guard_credit_status_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (
       new.credit_status is distinct from old.credit_status
       or new.credit_status_note is distinct from old.credit_status_note
       or new.credit_status_by is distinct from old.credit_status_by
       or new.credit_status_at is distinct from old.credit_status_at
     )
  then
    if not public.has_role(array['finance', 'admin']::app_role[]) then
      raise exception '铁律 5/6:只有 finance/admin 可修改客户信用状态(credit_status)';
    end if;
    new.credit_status_at = coalesce(new.credit_status_at, now());
    new.credit_status_by = coalesce(new.credit_status_by, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_guard_credit_status
  before update on customers
  for each row execute function public.fn_guard_credit_status_write();
