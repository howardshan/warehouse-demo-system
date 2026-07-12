-- ============================================================
-- Migration: 0011_batches_stock.sql
-- 守护铁律: 铁律 2/3/7/11（批次成本、双单位库存、拣货位单批号、全链路批号）
-- 目的: 建立批次、双单位库存、补货与盘点任务，并实现 ATP、最高在库成本及成本上涨提醒。
-- 关联文档: /docs/modules/03-inventory-locations.md
-- 补充文档: /docs/modules/04-pricing.md
-- 关联 ADR: /docs/decisions/0002-two-tier-locations.md, /docs/decisions/0006-cost-alert-nonblocking-margin-guard.md
-- 回滚: drop view v_max_cost_in_stock, v_atp; drop table inventory_counts, cycle_count_tasks, replenishment_tasks, stock, batches cascade;
-- ============================================================

create table batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  parent_batch_id uuid references batches(id),
  origin text not null check (origin in ('purchase','return','repack','opening','adjustment')),
  unit_cost numeric not null check (unit_cost >= 0),
  lot_no text not null check (btrim(lot_no) <> ''),
  expiry_date date,
  gr_line_id uuid unique references gr_lines(id),
  status batch_status not null default 'quality_hold',
  received_at timestamptz,
  created_by uuid default auth.uid() references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_batch_has_receipt check (origin <> 'purchase' or gr_line_id is not null),
  constraint child_batch_not_self check (parent_batch_id is null or parent_batch_id <> id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'price_history_related_batch_fk'
      and conrelid = 'public.price_history'::regclass
  ) then
    alter table price_history
      add constraint price_history_related_batch_fk
      foreign key (related_batch_id) references batches(id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'price_change_alerts_new_batch_fk'
      and conrelid = 'public.price_change_alerts'::regclass
  ) then
    alter table price_change_alerts
      add constraint price_change_alerts_new_batch_fk
      foreign key (new_batch_id) references batches(id);
  end if;
end;
$$;

create table stock (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id),
  batch_id uuid not null references batches(id),
  qty_units numeric not null default 0 check (qty_units >= 0),
  qty_weight_lb numeric not null default 0 check (qty_weight_lb >= 0),
  allocated_units numeric not null default 0 check (allocated_units >= 0),
  allocated_weight_lb numeric not null default 0 check (allocated_weight_lb >= 0),
  updated_at timestamptz not null default now(),
  unique (location_id, batch_id),
  constraint stock_allocated_within_on_hand check (
    allocated_units <= qty_units and allocated_weight_lb <= qty_weight_lb
  )
);

create or replace function public.fn_enforce_pick_face_single_batch()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  location_kind location_type;
begin
  select type into location_kind from locations where id = new.location_id;
  if location_kind = 'pick_face' and (new.qty_units > 0 or new.qty_weight_lb > 0) then
    perform pg_advisory_xact_lock(hashtextextended(new.location_id::text, 0));
    if exists (
      select 1
      from stock s
      where s.location_id = new.location_id
        and s.batch_id <> new.batch_id
        and (s.qty_units > 0 or s.qty_weight_lb > 0)
        and (tg_op = 'INSERT' or s.id <> new.id)
    ) then
      raise exception '铁律 7:拣货位 % 同时只能存放一个批次', new.location_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_pick_face_single_batch
  before insert or update of location_id, batch_id, qty_units, qty_weight_lb on stock
  for each row execute function public.fn_enforce_pick_face_single_batch();

create trigger trg_batches_updated_at
  before update on batches
  for each row execute function public.handle_updated_at();
create trigger trg_stock_updated_at
  before update on stock
  for each row execute function public.handle_updated_at();

create view v_atp as
select
  b.product_id,
  sum(s.qty_units) as on_hand_units,
  sum(s.qty_weight_lb) as on_hand_weight_lb,
  sum(s.allocated_units) as allocated_units,
  sum(s.allocated_weight_lb) as allocated_weight_lb,
  sum(s.qty_units - s.allocated_units) as atp_units,
  sum(s.qty_weight_lb - s.allocated_weight_lb) as atp_weight_lb
from stock s
join batches b on b.id = s.batch_id
join locations l on l.id = s.location_id
where b.status = 'available'
  and l.is_active
  and l.type <> 'quarantine'
group by b.product_id;

create view v_max_cost_in_stock as
select
  b.product_id,
  max(b.unit_cost) as max_unit_cost
from stock s
join batches b on b.id = s.batch_id
where b.status = 'available'
  and (s.qty_units > 0 or s.qty_weight_lb > 0)
group by b.product_id;

create or replace function public.fn_alert_purchase_cost_increase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prior_cost numeric;
  threshold_pct numeric;
  selling_price numeric;
  increase_pct numeric;
begin
  if new.origin <> 'purchase' then
    return new;
  end if;

  select b.unit_cost
    into prior_cost
  from batches b
  where b.product_id = new.product_id
    and b.origin = 'purchase'
    and b.id <> new.id
  order by b.created_at desc, b.id desc
  limit 1;

  if prior_cost is null or prior_cost <= 0 then
    return new;
  end if;

  select coalesce((value #>> '{}')::numeric, 3)
    into threshold_pct
  from settings where key = 'cost_alert_threshold_pct';
  threshold_pct := coalesce(threshold_pct, 3);
  increase_pct := ((new.unit_cost - prior_cost) / prior_cost) * 100;

  if increase_pct > threshold_pct then
    select current_price into selling_price from products where id = new.product_id;
    insert into price_change_alerts (
      product_id, new_batch_id, previous_cost, new_cost,
      cost_increase_pct, current_price, implied_margin_pct
    ) values (
      new.product_id, new.id, prior_cost, new.unit_cost,
      increase_pct, selling_price,
      case when selling_price > 0 then ((selling_price - new.unit_cost) / selling_price) * 100 end
    );
  end if;
  return new;
exception when others then
  raise warning '非阻断成本提醒生成失败(batch=%): %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger trg_alert_purchase_cost_increase
  after insert on batches
  for each row execute function public.fn_alert_purchase_cost_increase();

create table replenishment_tasks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  batch_id uuid not null references batches(id),
  from_location_id uuid not null references locations(id),
  to_location_id uuid not null references locations(id),
  qty_units numeric not null default 0 check (qty_units >= 0),
  qty_weight_lb numeric not null default 0 check (qty_weight_lb >= 0),
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  assigned_to uuid references user_profiles(id),
  reason text,
  created_by uuid default auth.uid() references user_profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint replenishment_positive_qty check (qty_units > 0 or qty_weight_lb > 0),
  constraint replenishment_locations_differ check (from_location_id <> to_location_id)
);

create table cycle_count_tasks (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id),
  batch_id uuid references batches(id),
  reason variance_reason not null default 'stock_mismatch',
  status text not null default 'open' check (status in ('open','counting','completed','cancelled')),
  assigned_to uuid references user_profiles(id),
  created_by uuid default auth.uid() references user_profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table inventory_counts (
  id uuid primary key default gen_random_uuid(),
  cycle_count_task_id uuid not null references cycle_count_tasks(id) on delete cascade,
  expected_units numeric not null check (expected_units >= 0),
  expected_weight_lb numeric not null check (expected_weight_lb >= 0),
  actual_units numeric not null check (actual_units >= 0),
  actual_weight_lb numeric not null check (actual_weight_lb >= 0),
  variance_reason variance_reason,
  counted_by uuid not null default auth.uid() references user_profiles(id),
  counted_at timestamptz not null default now(),
  constraint inventory_variance_needs_reason check (
    (expected_units = actual_units and expected_weight_lb = actual_weight_lb)
    or variance_reason is not null
  )
);

create trigger trg_replenishment_tasks_updated_at
  before update on replenishment_tasks
  for each row execute function public.handle_updated_at();

create index idx_batches_product_status on batches (product_id, status);
create index idx_batches_lot on batches (lot_no);
create index idx_batches_parent on batches (parent_batch_id);
create index idx_stock_batch on stock (batch_id);
create index idx_stock_location_positive on stock (location_id) where qty_units > 0 or qty_weight_lb > 0;
create index idx_replenishment_open on replenishment_tasks (status, to_location_id) where status in ('open','in_progress');
create index idx_cycle_count_open on cycle_count_tasks (status, location_id) where status in ('open','counting');

alter table batches enable row level security;
alter table stock enable row level security;
alter table replenishment_tasks enable row level security;
alter table cycle_count_tasks enable row level security;
alter table inventory_counts enable row level security;
alter table price_history enable row level security;
alter table price_change_alerts enable row level security;

create policy batches_select on batches for select to authenticated using (true);
create policy batches_write on batches for all to authenticated
  using (public.has_role(array['admin','purchasing','warehouse']::app_role[]))
  with check (public.has_role(array['admin','purchasing','warehouse']::app_role[]));
create policy stock_select on stock for select to authenticated using (true);
create policy stock_write on stock for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
create policy replenishment_select on replenishment_tasks for select to authenticated using (true);
create policy replenishment_write on replenishment_tasks for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
create policy cycle_count_select on cycle_count_tasks for select to authenticated
  using (public.has_role(array['admin','warehouse','finance']::app_role[]));
create policy cycle_count_write on cycle_count_tasks for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
create policy inventory_counts_select on inventory_counts for select to authenticated
  using (public.has_role(array['admin','warehouse','finance']::app_role[]));
create policy inventory_counts_write on inventory_counts for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
create policy price_history_select on price_history for select to authenticated
  using (public.has_role(array['admin','purchasing','sales_manager','finance']::app_role[]));
create policy price_alerts_select on price_change_alerts for select to authenticated
  using (public.has_role(array['admin','purchasing','sales_manager','finance']::app_role[]));
create policy price_alerts_update on price_change_alerts for update to authenticated
  using (public.has_role(array['admin','purchasing','sales_manager']::app_role[]))
  with check (public.has_role(array['admin','purchasing','sales_manager']::app_role[]));
