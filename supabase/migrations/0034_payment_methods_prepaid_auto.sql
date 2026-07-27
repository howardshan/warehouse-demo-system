-- ============================================================
-- 付款方式明细（现金/支票/ACH）+ 支票凭证 + 预存款自动抵扣
-- 回滚: drop trigger trg_apply_prepaid on shipping_lists;
--       drop function fn_apply_prepaid(uuid); drop function fn_prepaid_on_signed();
--       alter table customer_payments drop column check_no, drop column ach_txn_no, drop column proof_url;
-- ============================================================

alter table customer_payments
  add column check_no    text,
  add column ach_txn_no  text,
  add column proof_url   text;   -- 支票正面图片在 storage 的 path

-- 支票凭证存储桶（私有；读写走服务端 service role）
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- 预存款按 FIFO 自动抵扣该客户所有未付单，直到余额用完
create or replace function public.fn_apply_prepaid(p_customer uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bal numeric;
  r   record;
  pay numeric;
begin
  select prepaid_balance into bal from v_customer_prepaid where customer_id = p_customer;
  if bal is null or bal <= 0 then
    return;
  end if;
  for r in
    select shipping_list_id, balance_amount
    from v_sl_payment
    where customer_id = p_customer and balance_amount > 0
    order by signed_at asc nulls last
  loop
    exit when bal <= 0;
    pay := least(bal, r.balance_amount);
    if pay > 0 then
      insert into customer_payments (customer_id, shipping_list_id, kind, amount, from_prepaid, method)
      values (p_customer, r.shipping_list_id, 'order_payment', round(pay, 2), true, 'prepaid');
      bal := bal - pay;
    end if;
  end loop;
end;
$$;

-- 新签收/调整的发运单产生应付后，若客户有预存余额则自动抵扣
create or replace function public.fn_prepaid_on_signed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('signed','adjusted') then
    perform public.fn_apply_prepaid(new.customer_id);
  end if;
  return new;
end;
$$;

create trigger trg_apply_prepaid
  after insert or update of status on shipping_lists
  for each row execute function public.fn_prepaid_on_signed();

grant execute on function public.fn_apply_prepaid(uuid) to authenticated;
