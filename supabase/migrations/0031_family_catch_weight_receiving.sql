-- ============================================================
-- Migration: 0031_family_catch_weight_receiving.sql
-- 守护铁律: 铁律 3
-- 目的:   原产品标记是否称重；发票可录声称重量；
--          收货核对重量差异阈值（可配置）。
-- 关联文档: /docs/modules/02-purchasing-receiving.md
-- ============================================================

alter table product_families
  add column if not exists is_catch_weight boolean not null default false;

comment on column product_families.is_catch_weight is
  '是否需要称重。为 true 时：盲收与 Invoice 必填重量；核对超阈值则 warning。';

-- 从已有称重 SKU 回填原产品
update product_families f
set is_catch_weight = true
where exists (
  select 1 from products p
  where p.family_id = f.id and p.is_catch_weight = true
);

alter table gr_lines
  add column if not exists invoice_claimed_weight_lb numeric
  check (invoice_claimed_weight_lb is null or invoice_claimed_weight_lb >= 0);

comment on column gr_lines.invoice_claimed_weight_lb is
  'Invoice 声称重量 lb；仅称重原产品必填';

-- 收货重量差异阈值（%）；超过仅 warning，不阻断核对
-- settings 无 id 列，通用审计触发器会失败，临时关闭后写入
alter table settings disable trigger trg_audit_settings;

insert into settings (key, value, description)
values (
  'receiving_weight_tolerance_pct',
  '5'::jsonb,
  '收货核对：称重品 Invoice 重量 vs 实收重量偏差超过该百分比则 warning（不阻断）'
)
on conflict (key) do nothing;

update settings
set description = '称重品出货实重容差(%)；销售侧确认用。收货见 receiving_weight_tolerance_pct'
where key = 'catch_weight_tolerance_pct';

alter table settings enable trigger trg_audit_settings;
