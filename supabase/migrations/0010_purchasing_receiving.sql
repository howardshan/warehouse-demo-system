-- ============================================================
-- Migration: 0010_purchasing_receiving.sql
-- 守护铁律: 铁律 2/3/11（盲收、双单位、供应商批号不可缺失）
-- 目的: 建立采购订单、采购明细、收货单及盲收明细，并在数据库层约束实收数据。
-- 关联文档: /docs/modules/02-purchasing-receiving.md
-- 关联 ADR: /docs/decisions/0008-dual-uom-catch-weight.md
-- 回滚: drop table gr_lines, goods_receipts, po_lines, purchase_orders cascade;
-- ============================================================

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references suppliers(id),
  status po_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  currency_code text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  notes text,
  created_by uuid not null default auth.uid() references user_profiles(id),
  issued_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint po_expected_after_order check (expected_date is null or expected_date >= order_date),
  constraint po_issued_has_timestamp check (status = 'draft' or issued_at is not null),
  constraint po_closed_has_timestamp check (status not in ('closed', 'cancelled') or closed_at is not null)
);

create table po_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  line_no integer not null check (line_no > 0),
  product_id uuid not null references products(id),
  qty_units numeric not null check (qty_units > 0),
  estimated_weight_lb numeric check (estimated_weight_lb is null or estimated_weight_lb > 0),
  unit_cost numeric not null check (unit_cost >= 0),
  received_units numeric not null default 0 check (received_units >= 0),
  received_weight_lb numeric not null default 0 check (received_weight_lb >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_order_id, line_no)
);

create table goods_receipts (
  id uuid primary key default gen_random_uuid(),
  gr_number text not null unique,
  purchase_order_id uuid not null references purchase_orders(id),
  status gr_status not null default 'draft',
  received_at timestamptz not null default now(),
  received_by uuid not null default auth.uid() references user_profiles(id),
  supplier_document_no text,
  notes text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gr_posted_has_timestamp check (status <> 'posted' or posted_at is not null)
);

create table gr_lines (
  id uuid primary key default gen_random_uuid(),
  goods_receipt_id uuid not null references goods_receipts(id) on delete cascade,
  po_line_id uuid not null references po_lines(id),
  line_no integer not null check (line_no > 0),
  ordered_units numeric not null check (ordered_units >= 0),
  supplier_claimed_units numeric not null check (supplier_claimed_units >= 0),
  actual_units numeric not null check (actual_units >= 0),
  actual_weight_lb numeric not null check (actual_weight_lb >= 0),
  lot_no text not null check (btrim(lot_no) <> ''),
  expiry_date date,
  variance_reason variance_reason,
  notes text,
  created_at timestamptz not null default now(),
  unique (goods_receipt_id, line_no),
  constraint gr_line_variance_needs_reason check (
    (actual_units = supplier_claimed_units and variance_reason is null)
    or (actual_units <> supplier_claimed_units and variance_reason is not null)
  )
);

create trigger trg_purchase_orders_updated_at
  before update on purchase_orders
  for each row execute function public.handle_updated_at();
create trigger trg_po_lines_updated_at
  before update on po_lines
  for each row execute function public.handle_updated_at();
create trigger trg_goods_receipts_updated_at
  before update on goods_receipts
  for each row execute function public.handle_updated_at();

create index idx_purchase_orders_supplier_status on purchase_orders (supplier_id, status);
create index idx_po_lines_po on po_lines (purchase_order_id);
create index idx_po_lines_product on po_lines (product_id);
create index idx_goods_receipts_po on goods_receipts (purchase_order_id, received_at desc);
create index idx_gr_lines_receipt on gr_lines (goods_receipt_id);
create index idx_gr_lines_po_line on gr_lines (po_line_id);

alter table purchase_orders enable row level security;
alter table po_lines enable row level security;
alter table goods_receipts enable row level security;
alter table gr_lines enable row level security;

create policy purchase_orders_select on purchase_orders for select to authenticated
  using (public.has_role(array['admin','purchasing','warehouse','finance']::app_role[]));
create policy purchase_orders_write on purchase_orders for all to authenticated
  using (public.has_role(array['admin','purchasing']::app_role[]))
  with check (public.has_role(array['admin','purchasing']::app_role[]));
create policy po_lines_select on po_lines for select to authenticated
  using (public.has_role(array['admin','purchasing','warehouse','finance']::app_role[]));
create policy po_lines_write on po_lines for all to authenticated
  using (public.has_role(array['admin','purchasing']::app_role[]))
  with check (public.has_role(array['admin','purchasing']::app_role[]));
create policy goods_receipts_select on goods_receipts for select to authenticated
  using (public.has_role(array['admin','purchasing','warehouse','finance']::app_role[]));
create policy goods_receipts_write on goods_receipts for all to authenticated
  using (public.has_role(array['admin','purchasing','warehouse']::app_role[]))
  with check (public.has_role(array['admin','purchasing','warehouse']::app_role[]));
create policy gr_lines_select on gr_lines for select to authenticated
  using (public.has_role(array['admin','purchasing','warehouse','finance']::app_role[]));
create policy gr_lines_write on gr_lines for all to authenticated
  using (public.has_role(array['admin','warehouse']::app_role[]))
  with check (public.has_role(array['admin','warehouse']::app_role[]));
