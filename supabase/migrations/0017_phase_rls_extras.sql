-- ============================================================
-- Migration: 0017_phase_rls_extras.sql
-- 守护铁律: 铁律 1/3/4/7/8/11（统一单号、最小权限、跨表一致性与批次树无环）
-- 目的: 补齐文档号计数器、跨阶段索引/校验、视图调用权限及 Supabase authenticated 授权。
-- 关联文档: /docs/schema/rls.md
-- 补充文档: /docs/01-glossary.md
-- 关联 ADR: /docs/decisions/0001-price-snapshot.md, /docs/decisions/0002-two-tier-locations.md
-- 回滚: drop triggers trg_assign_*; drop function fn_assign_doc_number, next_doc_number; drop table doc_counters;
-- ============================================================

create table doc_counters (
  prefix text not null,
  period text not null,
  current_value bigint not null default 0 check (current_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (prefix, period),
  constraint doc_counter_prefix_format check (prefix ~ '^[A-Z][A-Z0-9_]{0,11}$'),
  constraint doc_counter_period_format check (period ~ '^[0-9]{8}$')
);

alter table doc_counters enable row level security;

create policy doc_counters_select_admin on doc_counters for select to authenticated
  using (public.has_role(array['admin']::app_role[]));

create or replace function public.next_doc_number(prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_prefix text := upper(btrim(prefix));
  current_period text := to_char(current_date, 'YYYYMMDD');
  next_value bigint;
begin
  if normalized_prefix !~ '^[A-Z][A-Z0-9_]{0,11}$' then
    raise exception '无效单号前缀:%', prefix;
  end if;

  insert into doc_counters (prefix, period, current_value)
  values (normalized_prefix, current_period, 1)
  on conflict on constraint doc_counters_pkey
  do update set
    current_value = doc_counters.current_value + 1,
    updated_at = now()
  returning doc_counters.current_value into next_value;

  return normalized_prefix || '-' || current_period || '-' || lpad(next_value::text, 6, '0');
end;
$$;

create or replace function public.fn_assign_doc_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_field text := tg_argv[1];
  current_value text;
begin
  current_value := to_jsonb(new) ->> target_field;
  if current_value is null or btrim(current_value) = '' then
    new := jsonb_populate_record(
      new,
      jsonb_build_object(target_field, public.next_doc_number(tg_argv[0]))
    );
  end if;
  return new;
end;
$$;

create trigger trg_assign_po_number
  before insert on purchase_orders
  for each row execute function public.fn_assign_doc_number('PO', 'po_number');
create trigger trg_assign_gr_number
  before insert on goods_receipts
  for each row execute function public.fn_assign_doc_number('GR', 'gr_number');
create trigger trg_assign_so_number
  before insert on sales_orders
  for each row execute function public.fn_assign_doc_number('SO', 'so_number');
create trigger trg_assign_pick_number
  before insert on pick_lists
  for each row execute function public.fn_assign_doc_number('PICK', 'pick_number');
create trigger trg_assign_sl_number
  before insert on shipping_lists
  for each row execute function public.fn_assign_doc_number('SL', 'sl_number');
create trigger trg_assign_return_number
  before insert on return_notes
  for each row execute function public.fn_assign_doc_number('RTN', 'return_number');
create trigger trg_assign_trip_number
  before insert on delivery_trips
  for each row execute function public.fn_assign_doc_number('TRIP', 'trip_number');
create trigger trg_assign_repack_number
  before insert on repack_orders
  for each row execute function public.fn_assign_doc_number('RPK', 'repack_number');

create or replace function public.fn_guard_batch_parent_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_batch_id is null then
    return new;
  end if;
  if new.parent_batch_id = new.id then
    raise exception '批次不能以自身作为父批次';
  end if;
  if exists (
    with recursive descendants as (
      select b.id
      from batches b
      where b.parent_batch_id = new.id
      union all
      select b.id
      from batches b
      join descendants d on b.parent_batch_id = d.id
    )
    select 1 from descendants where id = new.parent_batch_id
  ) then
    raise exception '批次父子关系不能形成环';
  end if;
  return new;
end;
$$;

create trigger trg_guard_batch_parent_cycle
  before insert or update of parent_batch_id on batches
  for each row execute function public.fn_guard_batch_parent_cycle();

create or replace function public.fn_validate_gr_line_po()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from goods_receipts gr
    join po_lines pol on pol.purchase_order_id = gr.purchase_order_id
    where gr.id = new.goods_receipt_id and pol.id = new.po_line_id
  ) then
    raise exception '收货行引用的采购行不属于该收货单采购订单';
  end if;
  return new;
end;
$$;

create trigger trg_validate_gr_line_po
  before insert or update of goods_receipt_id, po_line_id on gr_lines
  for each row execute function public.fn_validate_gr_line_po();

create or replace function public.fn_validate_shipping_header()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from pick_lists pl
    join sales_orders so on so.id = pl.sales_order_id
    where pl.id = new.pick_list_id
      and so.id = new.sales_order_id
      and so.customer_id = new.customer_id
  ) then
    raise exception '发运单的拣货单、销售订单和客户不匹配';
  end if;
  return new;
end;
$$;

create trigger trg_validate_shipping_header
  before insert or update of pick_list_id, sales_order_id, customer_id on shipping_lists
  for each row execute function public.fn_validate_shipping_header();

create index idx_sales_orders_delivery_address on sales_orders (delivery_address_id);
create index idx_goods_receipts_received_by on goods_receipts (received_by);
create index idx_shipping_lists_sales_order on shipping_lists (sales_order_id);
create index idx_shipping_lists_pick_list on shipping_lists (pick_list_id);
create index idx_return_notes_shipping_list on return_notes (shipping_list_id);
create index idx_return_lines_original_sl_line on return_lines (original_sl_line_id);
create index idx_replenishment_batch on replenishment_tasks (batch_id);
create index idx_cycle_count_batch on cycle_count_tasks (batch_id) where batch_id is not null;
create index idx_inventory_counts_task on inventory_counts (cycle_count_task_id);

alter view v_atp set (security_invoker = true);
alter view v_max_cost_in_stock set (security_invoker = true);
alter view v_billing_queue set (security_invoker = true);
alter view v_credit_exposure set (security_invoker = true);
alter view v_credit_note_queue set (security_invoker = true);
alter view v_batch_traceability set (security_invoker = true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on v_atp, v_max_cost_in_stock, v_billing_queue,
  v_credit_exposure, v_credit_note_queue, v_batch_traceability to authenticated;
grant execute on function public.next_doc_number(text) to authenticated;
grant execute on function public.cancel_pick_list(uuid, text) to authenticated;
grant execute on function public.restock_return_line(uuid, uuid) to authenticated;
grant execute on function public.batch_parent_chain(uuid) to authenticated;

revoke all on doc_counters from anon;
revoke all on function public.next_doc_number(text) from public;
revoke all on function public.cancel_pick_list(uuid, text) from public;
revoke all on function public.restock_return_line(uuid, uuid) from public;
