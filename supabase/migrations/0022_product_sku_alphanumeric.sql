-- ============================================================
-- Migration: 0022_product_sku_alphanumeric.sql
-- 守护铁律: —
-- 目的:   SKU 强制为字母数字编码（可含 -/_）；name 为销售产品名称。
-- 关联文档: /docs/modules/01-master-data.md
-- 关联 ADR: —
-- 回滚:   alter table products drop constraint products_sku_alphanumeric;
-- ============================================================

-- 先统一为大写，避免历史小写与约束冲突
update products
set sku = upper(btrim(sku))
where sku is distinct from upper(btrim(sku));

alter table products
  drop constraint if exists products_sku_alphanumeric;

alter table products
  add constraint products_sku_alphanumeric
  check (sku ~ '^[A-Z0-9]+([_-][A-Z0-9]+)*$');

comment on column products.sku is '包装级字母数字编码（SKU）';
comment on column products.name is '销售产品名称（面向销售/客户展示）';
