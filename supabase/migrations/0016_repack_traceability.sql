-- ============================================================
-- Migration: 0016_repack_traceability.sql
-- 守护铁律: 铁律 2/3/11（重包成本继承、双单位投入产出、父子批次全链路追溯）
-- 目的: 建立重包工单及产出批次，并提供批次祖先链与完整追溯视图。
-- 关联文档: /docs/modules/09-repack-traceability.md
-- 关联 ADR: /docs/decisions/0008-dual-uom-catch-weight.md
-- 回滚: drop view v_batch_traceability; drop function batch_parent_chain; drop table repack_outputs, repack_orders cascade;
-- ============================================================

create table repack_orders (
  id uuid primary key default gen_random_uuid(),
  repack_number text not null unique,
  input_batch_id uuid not null references batches(id),
  source_location_id uuid not null references locations(id),
  input_qty_units numeric not null default 0 check (input_qty_units >= 0),
  input_weight_lb numeric not null default 0 check (input_weight_lb >= 0),
  status text not null default 'draft'
    check (status in ('draft','released','in_progress','completed','cancelled')),
  scheduled_date date,
  completed_at timestamptz,
  completed_by uuid references user_profiles(id),
  notes text,
  created_by uuid not null default auth.uid() references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repack_input_positive check (input_qty_units > 0 or input_weight_lb > 0),
  constraint repack_completion_complete check (
    status <> 'completed' or (completed_at is not null and completed_by is not null)
  )
);

create table repack_outputs (
  id uuid primary key default gen_random_uuid(),
  repack_order_id uuid not null references repack_orders(id) on delete cascade,
  line_no integer not null check (line_no > 0),
  product_id uuid not null references products(id),
  target_location_id uuid not null references locations(id),
  lot_no text not null check (btrim(lot_no) <> ''),
  expiry_date date,
  qty_units numeric not null default 0 check (qty_units >= 0),
  weight_lb numeric not null default 0 check (weight_lb >= 0),
  unit_cost numeric not null check (unit_cost >= 0),
  output_batch_id uuid unique references batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (repack_order_id, line_no),
  constraint repack_output_positive check (qty_units > 0 or weight_lb > 0)
);

create or replace function public.fn_complete_repack()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  output_row record;
  created_batch_id uuid;
  source_available_units numeric;
  source_available_weight_lb numeric;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if not exists (select 1 from repack_outputs where repack_order_id = new.id) then
      raise exception '重包工单至少需要一个产出行';
    end if;

    select qty_units - allocated_units, qty_weight_lb - allocated_weight_lb
      into source_available_units, source_available_weight_lb
    from stock
    where location_id = new.source_location_id and batch_id = new.input_batch_id
    for update;
    if not found
       or source_available_units < new.input_qty_units
       or source_available_weight_lb < new.input_weight_lb then
      raise exception '重包投入超过来源储位可用库存';
    end if;

    for output_row in
      select * from repack_outputs where repack_order_id = new.id for update
    loop
      if output_row.output_batch_id is not null then
        raise exception '重包产出行 % 已生成批次', output_row.id;
      end if;
      insert into batches (
        product_id, parent_batch_id, origin, unit_cost, lot_no,
        expiry_date, status, received_at
      ) values (
        output_row.product_id, new.input_batch_id, 'repack',
        output_row.unit_cost, output_row.lot_no, output_row.expiry_date,
        'available', now()
      ) returning id into created_batch_id;

      insert into stock (location_id, batch_id, qty_units, qty_weight_lb)
      values (
        output_row.target_location_id, created_batch_id,
        output_row.qty_units, output_row.weight_lb
      );
      update repack_outputs
      set output_batch_id = created_batch_id
      where id = output_row.id;
    end loop;

    update stock
    set qty_units = qty_units - new.input_qty_units,
        qty_weight_lb = qty_weight_lb - new.input_weight_lb
    where location_id = new.source_location_id and batch_id = new.input_batch_id;

    if not exists (
      select 1 from stock
      where batch_id = new.input_batch_id
        and (qty_units > 0 or qty_weight_lb > 0)
    ) then
      update batches set status = 'depleted' where id = new.input_batch_id;
    end if;
    new.completed_at := coalesce(new.completed_at, now());
    new.completed_by := coalesce(new.completed_by, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function public.batch_parent_chain(p_batch_id uuid)
returns table (
  batch_id uuid,
  parent_batch_id uuid,
  depth integer,
  origin text,
  lot_no text
)
language sql
stable
set search_path = public
as $$
  with recursive chain(id, parent_batch_id, depth, origin, lot_no, path) as (
    select b.id, b.parent_batch_id, 0, b.origin, b.lot_no, array[b.id] as path
    from batches b where b.id = p_batch_id
    union all
    select b.id, b.parent_batch_id, c.depth + 1, b.origin, b.lot_no, c.path || b.id
    from batches b
    join chain c on c.parent_batch_id = b.id
    where not b.id = any(c.path)
  )
  select id, parent_batch_id, depth, origin, lot_no from chain
$$;

create view v_batch_traceability as
with recursive lineage as (
  select
    b.id as batch_id,
    b.id as ancestor_batch_id,
    b.parent_batch_id,
    0 as depth,
    array[b.id] as path
  from batches b
  union all
  select
    l.batch_id,
    p.id as ancestor_batch_id,
    p.parent_batch_id,
    l.depth + 1,
    l.path || p.id
  from lineage l
  join batches p on p.id = l.parent_batch_id
  where not p.id = any(l.path)
)
select
  l.batch_id,
  child.product_id,
  child.lot_no,
  child.origin,
  l.ancestor_batch_id,
  ancestor.product_id as ancestor_product_id,
  ancestor.lot_no as ancestor_lot_no,
  ancestor.origin as ancestor_origin,
  l.depth,
  l.path
from lineage l
join batches child on child.id = l.batch_id
join batches ancestor on ancestor.id = l.ancestor_batch_id;

create trigger trg_complete_repack
  before update of status on repack_orders
  for each row execute function public.fn_complete_repack();
create trigger trg_repack_orders_updated_at
  before update on repack_orders
  for each row execute function public.handle_updated_at();
create trigger trg_repack_outputs_updated_at
  before update on repack_outputs
  for each row execute function public.handle_updated_at();

create index idx_repack_orders_input_status on repack_orders (input_batch_id, status);
create index idx_repack_outputs_order on repack_outputs (repack_order_id);
create index idx_repack_outputs_batch on repack_outputs (output_batch_id) where output_batch_id is not null;

alter table repack_orders enable row level security;
alter table repack_outputs enable row level security;

create policy repack_orders_select on repack_orders for select to authenticated
  using (public.has_role(array['admin','warehouse','purchasing','finance']::app_role[]));
create policy repack_orders_write on repack_orders for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
create policy repack_outputs_select on repack_outputs for select to authenticated
  using (public.has_role(array['admin','warehouse','purchasing','finance']::app_role[]));
create policy repack_outputs_write on repack_outputs for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
