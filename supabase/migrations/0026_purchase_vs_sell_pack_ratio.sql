-- ============================================================
-- Migration: 0026_purchase_vs_sell_pack_ratio.sql
-- 目的:   采购单位与销售单位分离。
--          原产品仅一个可采购 SKU；销售 SKU 用 pack_contains_qty
--          表达「1 采购单位 = N 本包装」。
-- 关联文档: /docs/modules/01-master-data.md
-- ============================================================

alter table product_families
  add column if not exists purchase_uom text;

comment on column product_families.purchase_uom is
  '该原产品的唯一采购单位，如 case';

alter table products
  add column if not exists is_purchasable boolean not null default true,
  add column if not exists is_sellable boolean not null default true;

comment on column products.is_purchasable is '可出现在采购单（同族通常仅一个）';
comment on column products.is_sellable is '可出现在销售单';
comment on column products.pack_contains_qty is
  '换算：1 个原产品采购单位 = pack_contains_qty 个本包装。例：箱采包卖时袋装填 4 → 1:4';

-- 先整理演示数据，再加「同族仅一个可采购 SKU」约束
update product_families
set purchase_uom = coalesce(purchase_uom, 'case')
where code = 'GARLIC';

update products p
set
  is_purchasable = (p.sku = 'GARLIC-CASE'),
  is_sellable = true,
  pack_contains_qty = case
    when p.sku = 'GARLIC-BAG' then 4
    when p.sku = 'GARLIC-CASE' then 1
    else coalesce(p.pack_contains_qty, 1)
  end
from product_families f
where p.family_id = f.id
  and f.code = 'GARLIC';

-- 若历史数据同族多个可采购，保留订货单位=族采购单位的那个，其余改为不可采购
update products p
set is_purchasable = false
where p.is_purchasable
  and p.is_active
  and p.family_id is not null
  and exists (
    select 1
    from products p2
    where p2.family_id = p.family_id
      and p2.is_purchasable
      and p2.is_active
      and p2.id <> p.id
      and (
        p2.ordering_uom = (
          select coalesce(f.purchase_uom, p2.ordering_uom)
          from product_families f
          where f.id = p.family_id
        )
        or p.id > p2.id
      )
      and p.ordering_uom is distinct from (
        select coalesce(f.purchase_uom, p.ordering_uom)
        from product_families f
        where f.id = p.family_id
      )
  );

drop index if exists uniq_family_one_purchase_sku;
create unique index uniq_family_one_purchase_sku
  on products (family_id)
  where family_id is not null and is_purchasable and is_active;
