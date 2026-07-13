-- ============================================================
-- Migration: 0018_add_it_account_roles.sql
-- 守护铁律: —
-- 目的:   新增 IT / Account 角色（须单独提交后才能被下一迁移引用）
-- 关联文档: /docs/modules/01-master-data.md
-- 关联 ADR: —
-- 回滚:   —（enum 值不可安全删除）
-- ============================================================

alter type app_role add value if not exists 'account';
alter type app_role add value if not exists 'it';
