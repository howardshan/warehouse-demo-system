-- ============================================================
-- Migration: 0009_pricing_tables.sql
-- 守护铁律: 铁律 1
-- 目的:   改价留痕 + 成本上涨非阻断提醒队列。
-- 关联文档: /docs/modules/04-pricing.md
-- 关联 ADR: /docs/decisions/0001-price-snapshot.md
--           /docs/decisions/0006-cost-alert-nonblocking-margin-guard.md
-- 回滚:   drop table price_change_alerts, price_history;
-- ============================================================

create table price_history (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references products(id),
  old_price        numeric,
  new_price        numeric not null,
  changed_by       uuid not null references user_profiles(id),
  reason           text,
  related_batch_id uuid,
  created_at       timestamptz not null default now()
);

create table price_change_alerts (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references products(id),
  new_batch_id       uuid not null,
  previous_cost      numeric not null,
  new_cost           numeric not null,
  cost_increase_pct  numeric not null,
  current_price      numeric not null,
  implied_margin_pct numeric,
  status             text not null default 'open'
                     check (status in ('open', 'repriced', 'dismissed')),
  handled_by         uuid references user_profiles(id),
  handled_at         timestamptz,
  created_at         timestamptz not null default now()
);

create index idx_price_history_product on price_history (product_id, created_at desc);
create index idx_price_alerts_open on price_change_alerts (status) where status = 'open';

-- 改价时自动写 price_history
create or replace function public.fn_log_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.current_price is distinct from old.current_price then
    insert into price_history (product_id, old_price, new_price, changed_by, reason)
    values (new.id, old.current_price, new.current_price, coalesce(auth.uid(), new.id), 'product_update');
  end if;
  return new;
end;
$$;

create trigger trg_log_price_change
  after update of current_price on products
  for each row execute function public.fn_log_price_change();
