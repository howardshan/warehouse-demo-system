-- ============================================================
-- Migration: 0015_returns.sql
-- 守护铁律: 铁律 3/4/9/11（退货实重、司机权限隔离、退货先隔离、父子批次追溯）
-- 目的: 建立退货、配送调整与配送趟次；收货自动进入隔离区，复上架生成子批次。
-- 关联文档: /docs/modules/08-returns.md
-- 关联 ADR: /docs/decisions/0008-dual-uom-catch-weight.md
-- 回滚: drop view v_credit_note_queue; drop table delivery_adjustments, return_lines, return_notes, delivery_trips cascade;
-- ============================================================

create table delivery_trips (
  id uuid primary key default gen_random_uuid(),
  trip_number text not null unique,
  trip_date date not null default current_date,
  driver_id uuid not null references user_profiles(id),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null default auth.uid() references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table return_notes (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  return_type return_type not null,
  shipping_list_id uuid references shipping_lists(id),
  customer_id uuid not null references customers(id),
  delivery_trip_id uuid references delivery_trips(id),
  quarantine_location_id uuid not null references locations(id),
  status text not null default 'draft'
    check (status in ('draft','authorized','collected','received','processed','cancelled')),
  responsibility responsibility not null default 'under_investigation',
  authorized_by uuid references user_profiles(id),
  authorized_at timestamptz,
  collected_at timestamptz,
  photo_url text,
  signed_by_name text,
  received_at timestamptz,
  received_by uuid references user_profiles(id),
  notes text,
  created_by uuid not null default auth.uid() references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint return_collection_complete check (
    status not in ('collected','received','processed')
    or (collected_at is not null and photo_url is not null and signed_by_name is not null)
  ),
  constraint return_receive_complete check (
    status not in ('received','processed')
    or (received_at is not null and received_by is not null)
  )
);

create table return_lines (
  id uuid primary key default gen_random_uuid(),
  return_note_id uuid not null references return_notes(id) on delete cascade,
  line_no integer not null check (line_no > 0),
  original_sl_line_id uuid references sl_lines(id),
  product_id uuid not null references products(id),
  original_batch_id uuid references batches(id),
  qty_units numeric not null check (qty_units > 0),
  returned_weight_lb numeric check (returned_weight_lb is null or returned_weight_lb >= 0),
  is_catch_weight_snapshot boolean not null,
  unit_price_snapshot numeric not null check (unit_price_snapshot >= 0),
  return_reason return_reason not null,
  reason_detail text,
  disposition return_disposition not null default 'pending',
  quarantine_batch_id uuid references batches(id),
  disposition_batch_id uuid references batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (return_note_id, line_no)
);

create table delivery_adjustments (
  id uuid primary key default gen_random_uuid(),
  shipping_list_id uuid not null references shipping_lists(id),
  return_note_id uuid references return_notes(id),
  adjustment_type text not null check (adjustment_type in ('short_delivery','over_delivery','weight_correction','damage','other')),
  qty_units numeric not null default 0,
  adjusted_weight_lb numeric not null default 0,
  amount numeric not null,
  responsibility responsibility not null default 'under_investigation',
  reason text not null check (btrim(reason) <> ''),
  approved_by uuid references user_profiles(id),
  approved_at timestamptz,
  created_by uuid not null default auth.uid() references user_profiles(id),
  created_at timestamptz not null default now(),
  constraint delivery_adjustment_nonzero check (
    qty_units <> 0 or adjusted_weight_lb <> 0 or amount <> 0
  ),
  constraint delivery_adjustment_approval_complete check (
    (approved_by is null and approved_at is null)
    or (approved_by is not null and approved_at is not null)
  )
);

create or replace function public.fn_snapshot_return_line()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  original_line sl_lines%rowtype;
  product_row products%rowtype;
  parent_status text;
begin
  if new.original_sl_line_id is not null then
    select * into original_line from sl_lines where id = new.original_sl_line_id;
    if original_line.id is null
       or original_line.product_id <> new.product_id
       or (new.original_batch_id is not null and original_line.batch_id <> new.original_batch_id) then
      raise exception '退货行与原发运行商品/批次不匹配';
    end if;
    new.original_batch_id := original_line.batch_id;
    new.is_catch_weight_snapshot := original_line.is_catch_weight_snapshot;
    new.unit_price_snapshot := original_line.unit_price;
    if new.qty_units > original_line.shipped_units then
      raise exception '退货数量不能超过原发运数量';
    end if;
  else
    select * into product_row from products where id = new.product_id;
    if product_row.id is null then
      raise exception '退货商品不存在';
    end if;
    new.is_catch_weight_snapshot := product_row.is_catch_weight;
    new.unit_price_snapshot := coalesce(new.unit_price_snapshot, product_row.current_price);
  end if;

  select status into parent_status from return_notes where id = new.return_note_id;
  if new.is_catch_weight_snapshot
     and new.returned_weight_lb is null
     and parent_status in ('received','processed') then
    raise exception '铁律 3:称重品退货收货必须填写 returned_weight_lb';
  end if;
  return new;
end;
$$;

create or replace function public.fn_guard_return_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  location_kind location_type;
begin
  select type into location_kind from locations where id = new.quarantine_location_id;
  if location_kind <> 'quarantine' then
    raise exception '铁律 9:退货收货储位必须为 quarantine';
  end if;

  if tg_op = 'UPDATE' and public.has_role(array['driver']::app_role[])
     and not public.has_role(array['admin','warehouse']::app_role[]) then
    if new.collected_at is not distinct from old.collected_at
       and new.photo_url is not distinct from old.photo_url
       and new.signed_by_name is not distinct from old.signed_by_name then
      raise exception '司机更新未包含可写字段';
    end if;
    if new.id is distinct from old.id
       or new.return_number is distinct from old.return_number
       or new.return_type is distinct from old.return_type
       or new.shipping_list_id is distinct from old.shipping_list_id
       or new.customer_id is distinct from old.customer_id
       or new.delivery_trip_id is distinct from old.delivery_trip_id
       or new.quarantine_location_id is distinct from old.quarantine_location_id
       or new.status is distinct from old.status
       or new.responsibility is distinct from old.responsibility
       or new.authorized_by is distinct from old.authorized_by
       or new.authorized_at is distinct from old.authorized_at
       or new.received_at is distinct from old.received_at
       or new.received_by is distinct from old.received_by
       or new.notes is distinct from old.notes
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception '铁律 4:司机只能更新 collected_at、photo_url、signed_by_name';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.status in ('received','processed')
     and old.status not in ('received','processed') then
    if exists (
      select 1 from return_lines
      where return_note_id = new.id
        and is_catch_weight_snapshot
        and returned_weight_lb is null
    ) then
      raise exception '铁律 3:称重品退货收货必须填写 returned_weight_lb';
    end if;
    new.received_at := coalesce(new.received_at, now());
    new.received_by := coalesce(new.received_by, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function public.fn_quarantine_received_return()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  new_batch_id uuid;
begin
  if new.status in ('received','processed')
     and old.status not in ('received','processed') then
    for r in
      select
        rl.*,
        coalesce(b.unit_cost, 0) as source_cost,
        coalesce(b.lot_no, 'RETURN-' || new.return_number) as source_lot
      from return_lines rl
      left join batches b on b.id = rl.original_batch_id
      where rl.return_note_id = new.id and rl.quarantine_batch_id is null
      for update of rl
    loop
      insert into batches (
        product_id, parent_batch_id, origin, unit_cost, lot_no, status, received_at
      ) values (
        r.product_id, r.original_batch_id, 'return', r.source_cost,
        r.source_lot, 'quality_hold', now()
      ) returning id into new_batch_id;

      insert into stock (location_id, batch_id, qty_units, qty_weight_lb)
      values (
        new.quarantine_location_id, new_batch_id, r.qty_units,
        coalesce(r.returned_weight_lb, 0)
      );
      update return_lines set quarantine_batch_id = new_batch_id where id = r.id;
    end loop;
  end if;
  return new;
end;
$$;

create or replace function public.restock_return_line(
  p_return_line_id uuid,
  p_target_location_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r return_lines%rowtype;
  q batches%rowtype;
  target_kind location_type;
  new_batch_id uuid;
begin
  if not public.has_role(array['admin','warehouse']::app_role[]) then
    raise exception '只有 warehouse/admin 可处置退货';
  end if;
  select * into r from return_lines where id = p_return_line_id for update;
  if not found or r.quarantine_batch_id is null or r.disposition <> 'pending' then
    raise exception '退货行尚未隔离收货或已处置';
  end if;
  select type into target_kind from locations where id = p_target_location_id and is_active;
  if target_kind is null or target_kind in ('quarantine','receiving_dock','staging') then
    raise exception '复上架目标必须为有效库存储位';
  end if;
  select * into q from batches where id = r.quarantine_batch_id;

  insert into batches (
    product_id, parent_batch_id, origin, unit_cost, lot_no, expiry_date,
    status, received_at
  ) values (
    r.product_id, r.quarantine_batch_id, 'return', q.unit_cost, q.lot_no,
    q.expiry_date, 'available', now()
  ) returning id into new_batch_id;

  update stock
  set qty_units = greatest(qty_units - r.qty_units, 0),
      qty_weight_lb = greatest(qty_weight_lb - coalesce(r.returned_weight_lb, 0), 0)
  where batch_id = r.quarantine_batch_id;
  update batches set status = 'depleted' where id = r.quarantine_batch_id;

  insert into stock (location_id, batch_id, qty_units, qty_weight_lb)
  values (p_target_location_id, new_batch_id, r.qty_units, coalesce(r.returned_weight_lb, 0));

  update return_lines
  set disposition = 'restock', disposition_batch_id = new_batch_id
  where id = r.id;
  return new_batch_id;
end;
$$;

drop view v_credit_note_queue;
create view v_credit_note_queue as
select
  rn.id as return_note_id,
  rn.customer_id,
  sum(case when rl.is_catch_weight_snapshot
    then coalesce(rl.returned_weight_lb, 0) * rl.unit_price_snapshot
    else rl.qty_units * rl.unit_price_snapshot end) as credit_amount,
  string_agg(distinct rl.return_reason::text, ',') as reason
from return_notes rn
join return_lines rl on rl.return_note_id = rn.id
where rn.status in ('received','processed')
group by rn.id;

create trigger trg_snapshot_return_line
  before insert or update on return_lines
  for each row execute function public.fn_snapshot_return_line();
create trigger trg_guard_return_note
  before insert or update on return_notes
  for each row execute function public.fn_guard_return_note();
create trigger trg_quarantine_received_return
  after update of status on return_notes
  for each row execute function public.fn_quarantine_received_return();
create trigger trg_delivery_trips_updated_at
  before update on delivery_trips
  for each row execute function public.handle_updated_at();
create trigger trg_return_notes_updated_at
  before update on return_notes
  for each row execute function public.handle_updated_at();
create trigger trg_return_lines_updated_at
  before update on return_lines
  for each row execute function public.handle_updated_at();
create trigger trg_audit_return_notes
  after insert or update or delete on return_notes
  for each row execute function public.fn_audit_row();
create trigger trg_audit_return_lines
  after insert or update or delete on return_lines
  for each row execute function public.fn_audit_row();

create index idx_delivery_trips_driver_date on delivery_trips (driver_id, trip_date);
create index idx_return_notes_customer_status on return_notes (customer_id, status);
create index idx_return_notes_trip on return_notes (delivery_trip_id);
create index idx_return_lines_note on return_lines (return_note_id);
create index idx_return_lines_original_batch on return_lines (original_batch_id);
create index idx_delivery_adjustments_shipping on delivery_adjustments (shipping_list_id);

alter table delivery_trips enable row level security;
alter table return_notes enable row level security;
alter table return_lines enable row level security;
alter table delivery_adjustments enable row level security;

create policy delivery_trips_select on delivery_trips for select to authenticated
  using (
    driver_id = auth.uid()
    or public.has_role(array['admin','warehouse','sales_manager']::app_role[])
  );
create policy delivery_trips_write on delivery_trips for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
create policy return_notes_select on return_notes for select to authenticated
  using (
    exists (
      select 1 from delivery_trips dt
      where dt.id = delivery_trip_id and dt.driver_id = auth.uid()
    )
    or public.has_role(array['admin','warehouse','sales','sales_manager','finance']::app_role[])
  );
create policy return_notes_insert on return_notes for insert to authenticated
  with check (public.has_role(array['admin','warehouse','sales','sales_manager']::app_role[]));
create policy return_notes_update on return_notes for update to authenticated
  using (
    exists (
      select 1 from delivery_trips dt
      where dt.id = delivery_trip_id and dt.driver_id = auth.uid()
    )
    or public.has_role(array['admin','warehouse','sales_manager']::app_role[])
  )
  with check (
    exists (
      select 1 from delivery_trips dt
      where dt.id = delivery_trip_id and dt.driver_id = auth.uid()
    )
    or public.has_role(array['admin','warehouse','sales_manager']::app_role[])
  );
create policy return_lines_select on return_lines for select to authenticated
  using (public.has_role(array['admin','warehouse','sales','sales_manager','finance','driver']::app_role[]));
create policy return_lines_write on return_lines for all to authenticated
  using (public.has_role(array['admin','warehouse','sales_manager']::app_role[]))
  with check (public.has_role(array['admin','warehouse','sales_manager']::app_role[]));
create policy delivery_adjustments_select on delivery_adjustments for select to authenticated
  using (public.has_role(array['admin','warehouse','sales_manager','finance']::app_role[]));
create policy delivery_adjustments_write on delivery_adjustments for all to authenticated
  using (public.has_role(array['admin','finance']::app_role[]))
  with check (public.has_role(array['admin','finance']::app_role[]));
