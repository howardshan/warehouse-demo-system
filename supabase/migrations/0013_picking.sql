-- ============================================================
-- Migration: 0013_picking.sql
-- 守护铁律: 铁律 3/4/7/8（双单位拣货、审批拦截、按批次拣货、生成拣货单即锁单）
-- 目的: 建立拣货单与拣货明细，强制订单可拣状态、差异原因和订单锁定/撤销解锁。
-- 关联文档: /docs/modules/06-picking.md
-- 关联 ADR: /docs/decisions/0002-two-tier-locations.md, /docs/decisions/0008-dual-uom-catch-weight.md
-- 回滚: drop table pick_list_lines, pick_lists cascade; drop function cancel_pick_list;
-- ============================================================

create table pick_lists (
  id uuid primary key default gen_random_uuid(),
  pick_number text not null unique,
  sales_order_id uuid not null references sales_orders(id),
  status pick_status not null default 'created',
  assigned_to uuid references user_profiles(id),
  created_by uuid not null default auth.uid() references user_profiles(id),
  started_at timestamptz,
  picked_at timestamptz,
  weighed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pick_cancel_complete check (
    status <> 'cancelled'
    or (
      cancelled_at is not null
      and cancellation_reason is not null
      and btrim(cancellation_reason) <> ''
    )
  )
);

create unique index uq_active_pick_list_per_so
  on pick_lists (sales_order_id) where status <> 'cancelled';

create table pick_list_lines (
  id uuid primary key default gen_random_uuid(),
  pick_list_id uuid not null references pick_lists(id) on delete cascade,
  so_line_id uuid not null references so_lines(id),
  line_no integer not null check (line_no > 0),
  batch_id uuid not null references batches(id),
  source_location_id uuid not null references locations(id),
  tote_id uuid references totes(id),
  requested_units numeric not null check (requested_units > 0),
  expected_weight_lb numeric check (expected_weight_lb is null or expected_weight_lb >= 0),
  picked_units numeric check (picked_units is null or picked_units >= 0),
  actual_weight_lb numeric check (actual_weight_lb is null or actual_weight_lb >= 0),
  variance_reason variance_reason,
  picked_by uuid references user_profiles(id),
  picked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pick_list_id, line_no),
  constraint pick_variance_needs_reason check (
    picked_units is null
    or (
      picked_units = requested_units
      and (actual_weight_lb is null or expected_weight_lb is null or actual_weight_lb = expected_weight_lb)
    )
    or variance_reason is not null
  )
);

create or replace function public.fn_before_create_pick_list()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.fn_assert_so_pickable(new.sales_order_id);
  return new;
end;
$$;

create or replace function public.fn_lock_so_for_pick()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update sales_orders
  set locked_at = coalesce(locked_at, now()), status = 'picking'
  where id = new.sales_order_id;
  return new;
end;
$$;

create or replace function public.fn_validate_pick_line()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from pick_lists pl
    join so_lines sol on sol.sales_order_id = pl.sales_order_id
    join batches b on b.id = new.batch_id
    where pl.id = new.pick_list_id
      and sol.id = new.so_line_id
      and b.product_id = sol.product_id
      and b.status = 'available'
  ) then
    raise exception '拣货行的订单行、商品批次或可用状态不匹配';
  end if;
  if not exists (
    select 1 from stock
    where location_id = new.source_location_id and batch_id = new.batch_id
  ) then
    raise exception '来源储位不存在指定批次库存';
  end if;
  return new;
end;
$$;

create or replace function public.fn_guard_pick_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'weighed' and old.status is distinct from 'weighed' then
    if exists (
      select 1
      from pick_list_lines pll
      join so_lines sol on sol.id = pll.so_line_id
      where pll.pick_list_id = new.id
        and (
          pll.picked_units is null
          or (sol.is_catch_weight_snapshot and pll.actual_weight_lb is null)
        )
    ) then
      raise exception '称重完成前，所有拣货行必须完成数量，称重品必须填写 actual_weight_lb';
    end if;
    new.weighed_at := coalesce(new.weighed_at, now());
  end if;
  return new;
end;
$$;

create or replace function public.cancel_pick_list(
  p_pick_list_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_id uuid;
  current_status pick_status;
begin
  if not public.has_role(array['admin','warehouse','sales_manager']::app_role[]) then
    raise exception '无权撤销拣货单';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception '撤销拣货单必须填写原因';
  end if;

  select sales_order_id, status into order_id, current_status
  from pick_lists where id = p_pick_list_id for update;
  if not found then
    raise exception '拣货单不存在:%', p_pick_list_id;
  end if;
  if current_status in ('shipped','cancelled') then
    raise exception '状态为 % 的拣货单不能撤销', current_status;
  end if;

  update pick_lists
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason
  where id = p_pick_list_id;

  if not exists (
    select 1 from pick_lists
    where sales_order_id = order_id and status <> 'cancelled'
  ) then
    update sales_orders
    set locked_at = null, status = 'confirmed'
    where id = order_id and status = 'picking';
  end if;
end;
$$;

create trigger trg_before_create_pick_list
  before insert on pick_lists
  for each row execute function public.fn_before_create_pick_list();
create trigger trg_lock_so_for_pick
  after insert on pick_lists
  for each row execute function public.fn_lock_so_for_pick();
create trigger trg_validate_pick_line
  before insert or update of pick_list_id, so_line_id, batch_id, source_location_id on pick_list_lines
  for each row execute function public.fn_validate_pick_line();
create trigger trg_guard_pick_status
  before update of status on pick_lists
  for each row execute function public.fn_guard_pick_status();
create trigger trg_pick_lists_updated_at
  before update on pick_lists
  for each row execute function public.handle_updated_at();
create trigger trg_pick_list_lines_updated_at
  before update on pick_list_lines
  for each row execute function public.handle_updated_at();

create index idx_pick_lists_status on pick_lists (status, created_at);
create index idx_pick_lines_pick on pick_list_lines (pick_list_id);
create index idx_pick_lines_batch_location on pick_list_lines (batch_id, source_location_id);
create index idx_pick_lines_tote on pick_list_lines (tote_id) where tote_id is not null;

alter table pick_lists enable row level security;
alter table pick_list_lines enable row level security;

create policy pick_lists_select on pick_lists for select to authenticated
  using (public.has_role(array['admin','warehouse','sales','sales_manager','finance','driver']::app_role[]));
create policy pick_lists_write on pick_lists for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
create policy pick_list_lines_select on pick_list_lines for select to authenticated
  using (public.has_role(array['admin','warehouse','sales','sales_manager','finance','driver']::app_role[]));
create policy pick_list_lines_write on pick_list_lines for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
