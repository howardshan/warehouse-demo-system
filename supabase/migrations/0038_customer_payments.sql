-- ============================================================
-- Migration: 0038_customer_payments.sql
-- 守护铁律: —
-- 目的:   付款记录 / 预存款：订单付款 + 预存充值/退款；
--          发运单应收/已付/付款状态视图与客户预存余额视图。
--          （原 0033_customer_payments，因与权限迁移撞号重编为 0038）
-- 关联文档: /docs/modules/10-customers-credit.md
-- 回滚: drop view v_customer_prepaid, v_sl_payment; drop table customer_payments cascade;
-- ============================================================

-- 资金台账：订单付款 + 预存充值/退款
create table customer_payments (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references customers(id),
  shipping_list_id  uuid references shipping_lists(id),
  kind              text not null check (kind in ('order_payment','prepaid_topup','prepaid_refund')),
  amount            numeric not null check (amount > 0),
  from_prepaid      boolean not null default false,   -- 该笔订单付款是否从预存余额扣
  method            text,                             -- 现金/转账/微信…
  note              text,
  paid_at           timestamptz not null default now(),
  created_by        uuid default auth.uid() references user_profiles(id),
  created_at        timestamptz not null default now(),
  -- order_payment 必须挂发运单；预存充值/退款不挂
  constraint payment_shipping_link check (
    (kind = 'order_payment' and shipping_list_id is not null)
    or (kind in ('prepaid_topup','prepaid_refund') and shipping_list_id is null)
  ),
  -- 预存充值/退款不能来自预存余额
  constraint prepaid_not_from_prepaid check (
    kind = 'order_payment' or from_prepaid = false
  )
);

create index idx_customer_payments_customer on customer_payments (customer_id, paid_at desc);
create index idx_customer_payments_sl on customer_payments (shipping_list_id);
create index idx_customer_payments_kind on customer_payments (kind);

-- 每张已签收发运单的应收/已付/付款状态（未付/部分/已付）
create view v_sl_payment as
with due as (
  select
    sl.id as shipping_list_id,
    sl.customer_id,
    sl.sales_order_id,
    sl.signed_at,
    sum(case when l.is_catch_weight_snapshot
      then coalesce(l.shipped_weight_lb, 0) * l.unit_price
      else l.shipped_units * l.unit_price end) as due_amount
  from shipping_lists sl
  join sl_lines l on l.shipping_list_id = sl.id
  where sl.status in ('signed','adjusted')
  group by sl.id, sl.customer_id, sl.sales_order_id, sl.signed_at
),
paid as (
  select shipping_list_id, sum(amount) as paid_amount
  from customer_payments
  where kind = 'order_payment'
  group by shipping_list_id
)
select
  d.shipping_list_id,
  d.customer_id,
  d.sales_order_id,
  d.signed_at,
  d.due_amount,
  coalesce(p.paid_amount, 0) as paid_amount,
  d.due_amount - coalesce(p.paid_amount, 0) as balance_amount,
  case
    when coalesce(p.paid_amount, 0) <= 0 then 'unpaid'
    when coalesce(p.paid_amount, 0) >= d.due_amount then 'paid'
    else 'partial'
  end as pay_status
from due d
left join paid p on p.shipping_list_id = d.shipping_list_id;

-- 客户预存余额 = 充值 - 退款 - 已用于抵扣订单的部分
create view v_customer_prepaid as
select
  c.id as customer_id,
  coalesce(sum(case
    when p.kind = 'prepaid_topup' then p.amount
    when p.kind = 'prepaid_refund' then -p.amount
    when p.kind = 'order_payment' and p.from_prepaid then -p.amount
    else 0 end), 0) as prepaid_balance
from customers c
left join customer_payments p on p.customer_id = c.id
group by c.id;

-- 审计
create trigger trg_audit_customer_payments
  after insert or update or delete on customer_payments
  for each row execute function public.fn_audit_row();

-- RLS
alter table customer_payments enable row level security;

create policy customer_payments_select on customer_payments for select to authenticated
  using (public.has_role(array['admin','finance','account','sales','sales_manager']::app_role[]));
create policy customer_payments_write on customer_payments for all to authenticated
  using (public.has_role(array['admin','finance','account']::app_role[]))
  with check (public.has_role(array['admin','finance','account']::app_role[]));

alter view v_sl_payment set (security_invoker = true);
alter view v_customer_prepaid set (security_invoker = true);

grant select, insert, update, delete on customer_payments to authenticated;
grant select on v_sl_payment, v_customer_prepaid to authenticated;
