-- ============================================================
-- Migration: 0012_sales_orders.sql
-- 守护铁律: 铁律 1/3/4/8（售价与成本快照、双单位、审批拦截、拣货后订单锁定）
-- 目的: 建立销售订单、行项目和审批记录，并在数据库层冻结价格/成本快照与锁定后的商业字段。
-- 关联文档: /docs/modules/05-sales-orders.md
-- 关联 ADR: /docs/decisions/0001-price-snapshot.md, /docs/decisions/0006-cost-alert-nonblocking-margin-guard.md
-- 回滚: drop table so_approvals, so_lines, sales_orders cascade; drop function fn_assert_so_pickable;
-- ============================================================

create table sales_orders (
  id uuid primary key default gen_random_uuid(),
  so_number text not null unique,
  customer_id uuid not null references customers(id),
  delivery_address_id uuid references customer_addresses(id),
  sales_rep_id uuid not null default auth.uid() references user_profiles(id),
  status so_status not null default 'draft',
  order_date date not null default current_date,
  requested_delivery_date date,
  customer_name_snapshot text not null,
  delivery_address_snapshot text not null,
  payment_terms_days_snapshot integer not null check (payment_terms_days_snapshot >= 0),
  credit_limit_snapshot numeric not null check (credit_limit_snapshot >= 0),
  notes text,
  locked_at timestamptz,
  closed_at timestamptz,
  created_by uuid not null default auth.uid() references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint so_delivery_after_order check (
    requested_delivery_date is null or requested_delivery_date >= order_date
  ),
  constraint so_closed_has_timestamp check (
    status not in ('closed','cancelled') or closed_at is not null
  )
);

create or replace function public.fn_snapshot_sales_order_customer()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  c customers%rowtype;
  address_text text;
begin
  select * into c from customers where id = new.customer_id;
  if not found then
    raise exception '客户不存在:%', new.customer_id;
  end if;

  if new.delivery_address_id is not null then
    select address into address_text
    from customer_addresses
    where id = new.delivery_address_id and customer_id = new.customer_id;
    if address_text is null then
      raise exception '送货地址不属于订单客户';
    end if;
  else
    select address into address_text
    from customer_addresses
    where customer_id = new.customer_id and is_default
    order by created_at
    limit 1;
  end if;

  new.customer_name_snapshot := coalesce(nullif(new.customer_name_snapshot, ''), c.name);
  new.delivery_address_snapshot := coalesce(nullif(new.delivery_address_snapshot, ''), address_text);
  new.payment_terms_days_snapshot := coalesce(new.payment_terms_days_snapshot, c.payment_terms_days);
  new.credit_limit_snapshot := coalesce(new.credit_limit_snapshot, c.credit_limit);
  if new.delivery_address_snapshot is null then
    raise exception '销售订单必须具有送货地址快照';
  end if;
  return new;
end;
$$;

create trigger trg_snapshot_sales_order_customer
  before insert on sales_orders
  for each row execute function public.fn_snapshot_sales_order_customer();

create table so_lines (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_orders(id) on delete cascade,
  line_no integer not null check (line_no > 0),
  product_id uuid not null references products(id),
  qty_units numeric not null check (qty_units > 0),
  estimated_weight_lb numeric check (estimated_weight_lb is null or estimated_weight_lb > 0),
  is_catch_weight_snapshot boolean not null,
  unit_price numeric not null check (unit_price >= 0),
  price_overridden boolean not null default false,
  cost_snapshot numeric not null check (cost_snapshot >= 0),
  allocated_units numeric not null default 0 check (allocated_units >= 0),
  allocated_weight_lb numeric not null default 0 check (allocated_weight_lb >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sales_order_id, line_no),
  constraint so_line_allocation_within_order check (allocated_units <= qty_units),
  constraint catch_weight_so_line_needs_estimate check (
    not is_catch_weight_snapshot or estimated_weight_lb is not null
  )
);

create table so_approvals (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_orders(id) on delete cascade,
  approval_type text not null check (approval_type in ('margin','below_cost','credit')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  requested_by uuid not null default auth.uid() references user_profiles(id),
  decided_by uuid references user_profiles(id),
  reason text not null,
  decision_note text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint approval_decision_complete check (
    (status = 'pending' and decided_by is null and decided_at is null)
    or (status <> 'pending' and decided_by is not null and decided_at is not null)
  )
);

create or replace function public.fn_snapshot_so_line()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  p products%rowtype;
  current_cost numeric;
begin
  if tg_op = 'UPDATE'
     and exists (
       select 1 from sales_orders
       where id = new.sales_order_id and locked_at is not null
     ) then
    return new;
  end if;

  select * into p from products where id = new.product_id and is_active;
  if not found then
    raise exception '商品不存在或已停用:%', new.product_id;
  end if;

  new.is_catch_weight_snapshot := p.is_catch_weight;
  if not new.price_overridden or new.unit_price is null then
    new.unit_price := p.current_price;
  end if;

  if new.cost_snapshot is null or tg_op = 'INSERT' then
    select max_unit_cost into current_cost
    from v_max_cost_in_stock where product_id = new.product_id;
    if current_cost is null then
      select unit_cost into current_cost
      from batches
      where product_id = new.product_id
      order by created_at desc
      limit 1;
    end if;
    if current_cost is null then
      raise exception '商品 % 没有可用于订单快照的批次成本', new.product_id;
    end if;
    new.cost_snapshot := current_cost;
  end if;
  return new;
end;
$$;

create or replace function public.fn_guard_locked_sales_order()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.locked_at is not null and (
    new.customer_id is distinct from old.customer_id
    or new.delivery_address_id is distinct from old.delivery_address_id
    or new.order_date is distinct from old.order_date
    or new.requested_delivery_date is distinct from old.requested_delivery_date
    or new.customer_name_snapshot is distinct from old.customer_name_snapshot
    or new.delivery_address_snapshot is distinct from old.delivery_address_snapshot
    or new.payment_terms_days_snapshot is distinct from old.payment_terms_days_snapshot
    or new.credit_limit_snapshot is distinct from old.credit_limit_snapshot
    or new.notes is distinct from old.notes
    or new.sales_rep_id is distinct from old.sales_rep_id
  ) then
    raise exception '铁律 8:订单已锁定，禁止修改商业字段';
  end if;
  if old.locked_at is not null and new.locked_at is null and old.status <> 'picking' then
    raise exception '铁律 8:只能通过撤销未发运拣货单解锁订单';
  end if;
  return new;
end;
$$;

create or replace function public.fn_guard_locked_so_line()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  order_id uuid;
  is_locked boolean;
begin
  order_id := case when tg_op = 'DELETE' then old.sales_order_id else new.sales_order_id end;
  select exists (
    select 1 from sales_orders where id = order_id and locked_at is not null
  ) into is_locked;

  if is_locked and tg_op in ('INSERT','DELETE') then
    raise exception '铁律 8:订单已锁定，禁止新增或删除订单行';
  end if;
  if is_locked and tg_op = 'UPDATE' and (
    new.sales_order_id is distinct from old.sales_order_id
    or new.line_no is distinct from old.line_no
    or new.product_id is distinct from old.product_id
    or new.qty_units is distinct from old.qty_units
    or new.estimated_weight_lb is distinct from old.estimated_weight_lb
    or new.is_catch_weight_snapshot is distinct from old.is_catch_weight_snapshot
    or new.unit_price is distinct from old.unit_price
    or new.price_overridden is distinct from old.price_overridden
    or new.cost_snapshot is distinct from old.cost_snapshot
    or new.notes is distinct from old.notes
    or new.created_at is distinct from old.created_at
  ) then
    raise exception '铁律 8:订单已锁定，禁止修改订单行商业字段';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.fn_assert_so_pickable(p_sales_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status so_status;
begin
  select status into current_status
  from sales_orders where id = p_sales_order_id for update;
  if not found then
    raise exception '销售订单不存在:%', p_sales_order_id;
  end if;
  if current_status <> 'confirmed' then
    raise exception '铁律 4:只有 confirmed 订单可生成拣货单，当前状态:%', current_status;
  end if;
end;
$$;

create trigger trg_guard_locked_sales_order
  before update on sales_orders
  for each row execute function public.fn_guard_locked_sales_order();
create trigger trg_guard_locked_so_line
  before insert or update or delete on so_lines
  for each row execute function public.fn_guard_locked_so_line();
create trigger trg_snapshot_so_line
  before insert or update on so_lines
  for each row execute function public.fn_snapshot_so_line();
create trigger trg_sales_orders_updated_at
  before update on sales_orders
  for each row execute function public.handle_updated_at();
create trigger trg_so_lines_updated_at
  before update on so_lines
  for each row execute function public.handle_updated_at();
create trigger trg_audit_sales_orders
  after insert or update or delete on sales_orders
  for each row execute function public.fn_audit_row();
create trigger trg_audit_so_lines
  after insert or update or delete on so_lines
  for each row execute function public.fn_audit_row();

create index idx_sales_orders_customer_status on sales_orders (customer_id, status);
create index idx_sales_orders_rep on sales_orders (sales_rep_id, created_at desc);
create index idx_so_lines_order on so_lines (sales_order_id);
create index idx_so_lines_product on so_lines (product_id);
create index idx_so_approvals_pending on so_approvals (sales_order_id, status) where status = 'pending';

alter table sales_orders enable row level security;
alter table so_lines enable row level security;
alter table so_approvals enable row level security;

create policy sales_orders_select on sales_orders for select to authenticated
  using (
    sales_rep_id = auth.uid()
    or public.has_role(array['admin','sales_manager','finance','warehouse']::app_role[])
  );
create policy sales_orders_insert on sales_orders for insert to authenticated
  with check (
    public.has_role(array['admin','sales_manager']::app_role[])
    or (public.has_role(array['sales']::app_role[]) and sales_rep_id = auth.uid())
  );
create policy sales_orders_update on sales_orders for update to authenticated
  using (
    public.has_role(array['admin','sales_manager','finance','warehouse']::app_role[])
    or (public.has_role(array['sales']::app_role[]) and sales_rep_id = auth.uid())
  )
  with check (
    public.has_role(array['admin','sales_manager','finance','warehouse']::app_role[])
    or (public.has_role(array['sales']::app_role[]) and sales_rep_id = auth.uid())
  );
create policy sales_orders_delete on sales_orders for delete to authenticated
  using (
    status = 'draft'
    and (sales_rep_id = auth.uid() or public.has_role(array['admin','sales_manager']::app_role[]))
  );
create policy so_lines_select on so_lines for select to authenticated
  using (exists (
    select 1 from sales_orders so
    where so.id = sales_order_id
      and (so.sales_rep_id = auth.uid()
        or public.has_role(array['admin','sales_manager','finance','warehouse']::app_role[]))
  ));
create policy so_lines_write on so_lines for all to authenticated
  using (exists (
    select 1 from sales_orders so
    where so.id = sales_order_id
      and (so.sales_rep_id = auth.uid()
        or public.has_role(array['admin','sales_manager']::app_role[]))
  ))
  with check (exists (
    select 1 from sales_orders so
    where so.id = sales_order_id
      and (so.sales_rep_id = auth.uid()
        or public.has_role(array['admin','sales_manager']::app_role[]))
  ));
create policy so_approvals_select on so_approvals for select to authenticated
  using (
    requested_by = auth.uid()
    or public.has_role(array['admin','sales_manager','finance']::app_role[])
  );
create policy so_approvals_insert on so_approvals for insert to authenticated
  with check (
    requested_by = auth.uid()
    and public.has_role(array['admin','sales','sales_manager']::app_role[])
  );
create policy so_approvals_update on so_approvals for update to authenticated
  using (public.has_role(array['admin','sales_manager','finance']::app_role[]))
  with check (public.has_role(array['admin','sales_manager','finance']::app_role[]));
