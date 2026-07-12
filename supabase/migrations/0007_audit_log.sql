-- ============================================================
-- Migration: 0007_audit_log.sql
-- 守护铁律: 铁律 1（改价必须可追溯）
-- 目的:   通用审计日志。Phase 1 先挂 products(改价)与 customers
--          (信用/Block)。后续 Phase 追加 SO / Shipping List。
-- 关联文档: /docs/modules/01-master-data.md
-- 关联 ADR: /docs/decisions/0001-price-snapshot.md
-- 回滚:   drop trigger ...; drop function fn_audit_row; drop table audit_log;
-- ============================================================

create table audit_log (
  id            bigserial primary key,
  table_name    text not null,
  record_id     uuid not null,
  action        text not null check (action in ('insert', 'update', 'delete')),
  changed_by    uuid,
  old_values    jsonb,
  new_values    jsonb,
  created_at    timestamptz not null default now()
);

create index idx_audit_log_table_record on audit_log (table_name, record_id, created_at desc);
create index idx_audit_log_created on audit_log (created_at desc);

create or replace function public.fn_audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
begin
  if tg_op = 'DELETE' then
    rid := old.id;
    insert into audit_log (table_name, record_id, action, changed_by, old_values, new_values)
    values (tg_table_name, rid, 'delete', auth.uid(), to_jsonb(old), null);
    return old;
  elsif tg_op = 'UPDATE' then
    rid := new.id;
    insert into audit_log (table_name, record_id, action, changed_by, old_values, new_values)
    values (tg_table_name, rid, 'update', auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  else
    rid := new.id;
    insert into audit_log (table_name, record_id, action, changed_by, old_values, new_values)
    values (tg_table_name, rid, 'insert', auth.uid(), null, to_jsonb(new));
    return new;
  end if;
end;
$$;

create trigger trg_audit_products
  after insert or update or delete on products
  for each row execute function public.fn_audit_row();

create trigger trg_audit_customers
  after insert or update or delete on customers
  for each row execute function public.fn_audit_row();
