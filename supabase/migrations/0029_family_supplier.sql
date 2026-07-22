-- ============================================================
-- Migration: 0029_family_supplier.sql
-- 目的:   原产品绑定供应商。同一商品不同供应商分别建原产品，
--          各自维护进货/销售包装与价格，避免混价。
-- 关联文档: /docs/modules/01-master-data.md
-- ============================================================

alter table product_families
  add column if not exists supplier_id uuid references suppliers(id);

comment on column product_families.supplier_id is
  '所属供应商。同一品名不同供应商各建一条原产品，价格与包装相互独立。';

-- 编码在「供应商 + 编码」范围内唯一（可同码不同供应商）
alter table product_families drop constraint if exists product_families_code_key;

drop index if exists uniq_product_families_supplier_code;
create unique index uniq_product_families_supplier_code
  on product_families (supplier_id, code)
  nulls not distinct;

create index if not exists idx_product_families_supplier
  on product_families (supplier_id);
