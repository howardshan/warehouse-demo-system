-- ============================================================
-- Migration: 0021_blind_receive_no_claimed_on_floor.sql
-- 守护铁律: 铁律 13（盲收）
-- 目的:   盲收现场只录实收；供应商声称数量由送货单另行录入。
--          claimed=0 表示送货单尚未录入，不强制差异原因。
-- 关联文档: /docs/modules/02-purchasing-receiving.md
-- 关联 ADR: —
-- 回滚:   恢复原 variance 约束（仅开发期）
-- ============================================================

alter table gr_lines drop constraint if exists gr_line_variance_needs_reason;

alter table gr_lines add constraint gr_line_variance_needs_reason check (
  -- 送货单未录入(claimed=0)时，盲收可先写实收，不要求差异原因
  supplier_claimed_units = 0
  or (
    actual_units = supplier_claimed_units
    and variance_reason is null
  )
  or (
    actual_units <> supplier_claimed_units
    and variance_reason is not null
  )
);
