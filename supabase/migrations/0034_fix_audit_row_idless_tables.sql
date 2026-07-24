-- ============================================================
-- Migration: 0034_fix_audit_row_idless_tables.sql
-- 守护铁律: 铁律 14（全链路修改留痕）——修复审计对复合主键表失效的缺陷
-- 目的:   fn_audit_row() 原硬取 new.id / old.id，对无 id 列的复合主键表
--          （user_permissions、settings）会抛错 "record \"new\" has no field \"id\""，
--          导致这些表任何写入失败——即 /it/permissions 勾选权限、/settings 改阈值
--          实际上保存即报错（0031 曾临时禁用 settings 审计触发器规避）。
--          改为用 to_jsonb(row)->>'id' 提取（无该列则为 null），并放开 record_id 可空。
-- 关联文档: /docs/decisions/0011-permission-based-rls.md
-- 关联 ADR: 0011
-- 回滚:   将 fn_audit_row 恢复为 new.id 版；record_id 恢复 not null（需先清理 null 行）。
-- ============================================================

-- 1) 复合主键表无单一 uuid 主键，record_id 允许为空（完整行仍存于 old/new_values）
alter table audit_log alter column record_id drop not null;

-- 2) 通用审计函数：用 jsonb 提取 id，兼容无 id 列的表
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
    rid := (to_jsonb(old) ->> 'id')::uuid;
    insert into audit_log (table_name, record_id, action, changed_by, old_values, new_values)
    values (tg_table_name, rid, 'delete', auth.uid(), to_jsonb(old), null);
    return old;
  elsif tg_op = 'UPDATE' then
    rid := (to_jsonb(new) ->> 'id')::uuid;
    insert into audit_log (table_name, record_id, action, changed_by, old_values, new_values)
    values (tg_table_name, rid, 'update', auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  else
    rid := (to_jsonb(new) ->> 'id')::uuid;
    insert into audit_log (table_name, record_id, action, changed_by, old_values, new_values)
    values (tg_table_name, rid, 'insert', auth.uid(), null, to_jsonb(new));
    return new;
  end if;
end;
$$;

-- 3) 确保 settings 审计触发器处于启用状态（0031 曾临时禁用；修复后应常开）
alter table settings enable trigger trg_audit_settings;
