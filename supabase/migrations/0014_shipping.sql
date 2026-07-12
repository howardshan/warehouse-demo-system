-- ============================================================
-- Migration: 0014_shipping.sql
-- 守护铁律: 铁律 1/3/4/5/10（发运快照、实重开票、签收锁定、信用复核、释放未发数量）
-- 目的: 建立发运单和发运行、签收状态机、计费/信用视图及签收后的库存与订单收口。
-- 关联文档: /docs/modules/07-shipping.md
-- 补充文档: /docs/modules/10-customers-credit.md
-- 关联 ADR: /docs/decisions/0004-credit-includes-signed-uninvoiced.md, /docs/decisions/0008-dual-uom-catch-weight.md
-- 回滚: drop view v_credit_note_queue, v_credit_exposure, v_billing_queue; drop table sl_lines, shipping_lists cascade;
-- ============================================================

create table shipping_lists (
  id uuid primary key default gen_random_uuid(),
  sl_number text not null unique,
  pick_list_id uuid not null unique references pick_lists(id),
  sales_order_id uuid not null references sales_orders(id),
  customer_id uuid not null references customers(id),
  status sl_status not null default 'draft',
  invoice_status invoice_status not null default 'pending',
  driver_id uuid references user_profiles(id),
  released_at timestamptz,
  signed_at timestamptz,
  signed_by_name text,
  proof_url text,
  created_by uuid not null default auth.uid() references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signed_shipping_complete check (
    status <> 'signed'
    or (signed_at is not null and signed_by_name is not null and btrim(signed_by_name) <> '')
  )
);

create table sl_lines (
  id uuid primary key default gen_random_uuid(),
  shipping_list_id uuid not null references shipping_lists(id) on delete cascade,
  pick_list_line_id uuid not null references pick_list_lines(id),
  so_line_id uuid not null references so_lines(id),
  line_no integer not null check (line_no > 0),
  product_id uuid not null references products(id),
  batch_id uuid not null references batches(id),
  shipped_units numeric not null check (shipped_units >= 0),
  shipped_weight_lb numeric check (shipped_weight_lb is null or shipped_weight_lb >= 0),
  is_catch_weight_snapshot boolean not null,
  unit_price numeric not null check (unit_price >= 0),
  cost_snapshot numeric not null check (cost_snapshot >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shipping_list_id, line_no),
  unique (shipping_list_id, pick_list_line_id)
);

create or replace function public.fn_snapshot_shipping_line()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_line so_lines%rowtype;
  picked_line pick_list_lines%rowtype;
begin
  select * into source_line from so_lines where id = new.so_line_id;
  select * into picked_line from pick_list_lines where id = new.pick_list_line_id;
  if source_line.id is null or picked_line.id is null
     or picked_line.so_line_id <> source_line.id
     or picked_line.batch_id <> new.batch_id
     or source_line.product_id <> new.product_id then
    raise exception '发运行与订单行/拣货行/批次不匹配';
  end if;
  if not exists (
    select 1 from shipping_lists sl
    join pick_lists pl on pl.id = sl.pick_list_id
    where sl.id = new.shipping_list_id
      and pl.id = picked_line.pick_list_id
      and sl.sales_order_id = source_line.sales_order_id
  ) then
    raise exception '发运行不属于对应发运单、拣货单和销售订单';
  end if;
  new.is_catch_weight_snapshot := source_line.is_catch_weight_snapshot;
  new.unit_price := source_line.unit_price;
  new.cost_snapshot := source_line.cost_snapshot;
  if picked_line.picked_units is not null and new.shipped_units > picked_line.picked_units then
    raise exception '发运数量不能超过实拣数量';
  end if;
  if new.is_catch_weight_snapshot
     and new.shipped_weight_lb is null
     and exists (
       select 1 from shipping_lists
       where id = new.shipping_list_id and invoice_status <> 'pending'
     ) then
    raise exception '铁律 3/4:非待开票发运单的称重品必须填写 shipped_weight_lb';
  end if;
  return new;
end;
$$;

create or replace function public.fn_lock_signed_sl_lines()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  header_id uuid;
begin
  header_id := case when tg_op = 'DELETE' then old.shipping_list_id else new.shipping_list_id end;
  if exists (select 1 from shipping_lists where id = header_id and status = 'signed') then
    raise exception '铁律 4:已签收发运单的明细禁止修改或删除';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.fn_guard_shipping_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pick_state pick_status;
  exposure_amount numeric;
  customer_limit numeric;
  customer_state customer_credit_status;
  check_result text;
begin
  if new.invoice_status <> 'pending'
     and new.invoice_status is distinct from old.invoice_status
     and exists (
       select 1 from sl_lines
       where shipping_list_id = new.id
         and is_catch_weight_snapshot
         and shipped_weight_lb is null
     ) then
    raise exception '铁律 3/4:称重品未填写发运实重，不得开票或作废待开票状态';
  end if;

  if new.status in ('released','in_transit','signed')
     and new.status is distinct from old.status then
    select status into pick_state from pick_lists where id = new.pick_list_id;
    if pick_state = 'picked_pending_weight' then
      raise exception '铁律 4:拣货单仍待称重，不得放行发运';
    end if;
    if pick_state not in ('weighed','shipped') then
      raise exception '只有已称重拣货单可放行，当前状态:%', pick_state;
    end if;
  end if;

  if new.status = 'released' and old.status is distinct from 'released' then
    select exposure, credit_limit, credit_status
      into exposure_amount, customer_limit, customer_state
    from v_credit_exposure where customer_id = new.customer_id;
    check_result := case
      when customer_state in ('full_block','hold_new_orders') then 'blocked'
      when exposure_amount > customer_limit then 'blocked'
      when customer_limit > 0 and exposure_amount >= customer_limit * 0.8 then 'warning'
      else 'pass'
    end;
    insert into credit_checks (
      customer_id, checkpoint, ref_type, ref_id, exposure, credit_limit,
      result, overridden_by
    ) values (
      new.customer_id, 'shipping_release', 'shipping_list', new.id,
      exposure_amount, customer_limit, check_result,
      case when check_result = 'blocked'
        and public.has_role(array['admin','finance']::app_role[]) then auth.uid() end
    );
    if check_result = 'blocked'
       and not public.has_role(array['admin','finance']::app_role[]) then
      raise exception '铁律 5:客户信用检查未通过，发运不得放行';
    end if;
    new.released_at := coalesce(new.released_at, now());
  end if;

  if new.status = 'signed' and old.status is distinct from 'signed' then
    new.signed_at := coalesce(new.signed_at, now());
  end if;
  return new;
end;
$$;

create or replace function public.fn_finalize_signed_shipping()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.status = 'signed' and old.status is distinct from 'signed' then
    for r in
      select
        pll.id as pick_line_id,
        pll.so_line_id,
        pll.batch_id,
        pll.source_location_id,
        coalesce(pll.picked_units, 0) as picked_units,
        coalesce(pll.actual_weight_lb, 0) as picked_weight_lb,
        coalesce(sum(sll.shipped_units), 0) as shipped_units,
        coalesce(sum(sll.shipped_weight_lb), 0) as shipped_weight_lb
      from pick_list_lines pll
      left join sl_lines sll
        on sll.pick_list_line_id = pll.id and sll.shipping_list_id = new.id
      where pll.pick_list_id = new.pick_list_id
      group by pll.id
    loop
      update stock
      set
        qty_units = greatest(qty_units - r.shipped_units, 0),
        qty_weight_lb = greatest(qty_weight_lb - r.shipped_weight_lb, 0),
        allocated_units = greatest(allocated_units - r.picked_units, 0),
        allocated_weight_lb = greatest(allocated_weight_lb - r.picked_weight_lb, 0)
      where location_id = r.source_location_id and batch_id = r.batch_id;

      update so_lines
      set
        allocated_units = greatest(allocated_units - r.picked_units, 0),
        allocated_weight_lb = greatest(allocated_weight_lb - r.picked_weight_lb, 0)
      where id = r.so_line_id;
    end loop;

    update pick_lists set status = 'shipped' where id = new.pick_list_id;
    update sales_orders
    set status = 'closed', closed_at = now()
    where id = new.sales_order_id;
  end if;
  return new;
end;
$$;

create view v_billing_queue as
select
  sl.id as shipping_list_id,
  sl.sl_number,
  sl.sales_order_id,
  sl.customer_id,
  sl.signed_at,
  bool_and(not sll.is_catch_weight_snapshot or sll.shipped_weight_lb is not null) as weight_complete,
  sum(
    case when sll.is_catch_weight_snapshot
      then coalesce(sll.shipped_weight_lb, 0) * sll.unit_price
      else sll.shipped_units * sll.unit_price
    end
  ) as billable_amount
from shipping_lists sl
join sl_lines sll on sll.shipping_list_id = sl.id
where sl.status = 'signed' and sl.invoice_status = 'pending'
group by sl.id;

create view v_credit_exposure as
with open_orders as (
  select
    so.customer_id,
    sum(case when sol.is_catch_weight_snapshot
      then coalesce(sol.estimated_weight_lb, 0) * sol.unit_price
      else sol.qty_units * sol.unit_price end) as amount
  from sales_orders so
  join so_lines sol on sol.sales_order_id = so.id
  where so.status in ('confirmed','picking','shipped')
  group by so.customer_id
),
signed_uninvoiced as (
  select
    sl.customer_id,
    sum(case when sll.is_catch_weight_snapshot
      then coalesce(sll.shipped_weight_lb, 0) * sll.unit_price
      else sll.shipped_units * sll.unit_price end) as amount
  from shipping_lists sl
  join sl_lines sll on sll.shipping_list_id = sl.id
  where sl.status = 'signed' and sl.invoice_status = 'pending'
  group by sl.customer_id
)
select
  c.id as customer_id,
  c.credit_limit,
  c.credit_status,
  coalesce(oo.amount, 0) as open_order_exposure,
  coalesce(su.amount, 0) as signed_uninvoiced_exposure,
  coalesce(oo.amount, 0) + coalesce(su.amount, 0) as exposure,
  c.credit_limit - coalesce(oo.amount, 0) - coalesce(su.amount, 0) as available_credit
from customers c
left join open_orders oo on oo.customer_id = c.id
left join signed_uninvoiced su on su.customer_id = c.id;

create view v_credit_note_queue as
select
  null::uuid as return_note_id,
  null::uuid as customer_id,
  null::numeric as credit_amount,
  null::text as reason
where false;

create trigger trg_snapshot_shipping_line
  before insert or update on sl_lines
  for each row execute function public.fn_snapshot_shipping_line();
create trigger trg_lock_signed_sl_lines
  before update or delete on sl_lines
  for each row execute function public.fn_lock_signed_sl_lines();
create trigger trg_guard_shipping_transition
  before update on shipping_lists
  for each row execute function public.fn_guard_shipping_transition();
create trigger trg_finalize_signed_shipping
  after update of status on shipping_lists
  for each row execute function public.fn_finalize_signed_shipping();
create trigger trg_shipping_lists_updated_at
  before update on shipping_lists
  for each row execute function public.handle_updated_at();
create trigger trg_sl_lines_updated_at
  before update on sl_lines
  for each row execute function public.handle_updated_at();
create trigger trg_audit_shipping_lists
  after insert or update or delete on shipping_lists
  for each row execute function public.fn_audit_row();
create trigger trg_audit_sl_lines
  after insert or update or delete on sl_lines
  for each row execute function public.fn_audit_row();

create index idx_shipping_lists_customer_status on shipping_lists (customer_id, status);
create index idx_shipping_lists_billing on shipping_lists (invoice_status, status);
create index idx_shipping_lists_driver on shipping_lists (driver_id, status);
create index idx_sl_lines_shipping on sl_lines (shipping_list_id);
create index idx_sl_lines_batch on sl_lines (batch_id);

alter table shipping_lists enable row level security;
alter table sl_lines enable row level security;

create policy shipping_lists_select on shipping_lists for select to authenticated
  using (
    driver_id = auth.uid()
    or public.has_role(array['admin','warehouse','sales','sales_manager','finance']::app_role[])
  );
create policy shipping_lists_write on shipping_lists for all to authenticated
  using (public.has_role(array['admin','warehouse','finance']::app_role[]))
  with check (public.has_role(array['admin','warehouse','finance']::app_role[]));
create policy sl_lines_select on sl_lines for select to authenticated
  using (exists (
    select 1 from shipping_lists sl
    where sl.id = shipping_list_id
      and (sl.driver_id = auth.uid()
        or public.has_role(array['admin','warehouse','sales','sales_manager','finance']::app_role[]))
  ));
create policy sl_lines_write on sl_lines for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
