-- ============================================================
-- Migration: 0030_family_code_globally_unique.sql
-- 目的:   原产品编码全局唯一，不同供应商也不可共用同一编码。
-- 关联文档: /docs/modules/01-master-data.md
-- ============================================================

drop index if exists uniq_product_families_supplier_code;

alter table product_families
  drop constraint if exists product_families_code_key;

alter table product_families
  add constraint product_families_code_key unique (code);
