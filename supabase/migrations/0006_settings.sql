-- ============================================================
-- Migration: 0006_settings.sql
-- 守护铁律: 铁律 5, 6（信用阈值）+ 毛利护栏阈值
-- 目的:   系统可配置阈值集中存放。成本上涨提醒阈值、毛利线、
--          漏称超时、信用预警比例等不得散落硬编码。
-- 关联文档: /docs/modules/01-master-data.md
-- 关联 ADR: /docs/decisions/0006-cost-alert-nonblocking-margin-guard.md
-- 回滚:   drop table settings;
-- ============================================================

create table settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references user_profiles(id)
);

create trigger trg_settings_updated_at
  before update on settings
  for each row execute function public.handle_updated_at();

insert into settings (key, value, description) values
  ('cost_alert_threshold_pct', '3'::jsonb, '成本涨幅超过该百分比才生成非阻断提醒'),
  ('margin_threshold_pct', '15'::jsonb, '毛利率低于该百分比需 Manager 审批'),
  ('allow_below_cost', 'false'::jsonb, '低于成本价是否允许(false=一律禁止)'),
  ('pending_weight_alert_hours', '4'::jsonb, '拣完未称重超过 N 小时飘红'),
  ('credit_warning_pct', '80'::jsonb, '占用超过 limit 该比例 → 黄色预警'),
  ('include_unshipped_in_exposure', 'true'::jsonb, '信用占用是否计入已确认未发货'),
  ('catch_weight_tolerance_pct', '5'::jsonb, '称重品实重容差(%),超出需销售确认');
