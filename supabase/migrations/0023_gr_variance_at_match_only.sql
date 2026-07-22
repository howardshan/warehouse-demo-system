-- ============================================================
-- Migration: 0023_gr_variance_at_match_only.sql
-- 守护铁律: 铁律 13、14
-- 目的:   盲收与送货单分页独立录入时，draft 阶段允许 claimed≠actual
--          且暂无差异原因；差异原因在三单核对页补齐并校验。
-- 关联文档: /docs/modules/02-purchasing-receiving.md
-- 回滚:   恢复 0021 约束（仅开发期）
-- ============================================================

alter table gr_lines drop constraint if exists gr_line_variance_needs_reason;

-- 过账/核对完成后仍要求：有差异必须有原因（由应用在 submit 时强制）
-- draft 期间允许双方独立填写，不互相看见对方数量。
