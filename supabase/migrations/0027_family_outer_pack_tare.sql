-- ============================================================
-- Migration: 0027_family_outer_pack_tare.sql
-- 目的:   原产品可选外包装重量(lb)。散卖去盒时用于净重库存；
--          整箱卖不扣减。销售 SKU 用 requires_debox 标明是否去盒。
-- 关联文档: /docs/modules/01-master-data.md
-- ============================================================

alter table product_families
  add column if not exists outer_pack_weight_lb numeric
  check (outer_pack_weight_lb is null or outer_pack_weight_lb >= 0);

comment on column product_families.outer_pack_weight_lb is
  '可选。每个采购外包装(盒/箱)的皮重 lb。散卖去盒时：净重=毛重−件数×皮重；整箱卖不扣。';

alter table products
  add column if not exists requires_debox boolean not null default false;

comment on column products.requires_debox is
  '散卖需去盒：库存/称重按净重，扣减原产品 outer_pack_weight_lb；整箱卖为 false';
