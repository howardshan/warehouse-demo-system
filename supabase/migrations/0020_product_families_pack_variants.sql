-- ============================================================
-- Migration: 0020_product_families_pack_variants.sql
-- 守护铁律: 铁律 1, 3
-- 目的:   原产品(product_families) + 多包装 SKU。
--          例:大蒜可按「箱」或「包」卖,各有独立 SKU/价,
--          但同属一个原产品,便于采购选单位与追溯同源。
-- 关联文档: /docs/modules/01-master-data.md
-- 关联 ADR: /docs/decisions/0008-dual-uom-catch-weight.md
-- 回滚:   alter table products drop column family_id, pack_contains_qty;
--          drop table product_families;
-- ============================================================

create table product_families (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table products
  add column family_id uuid references product_families(id),
  add column pack_contains_qty numeric not null default 1
    check (pack_contains_qty > 0);

comment on column products.family_id is
  '原产品族。同族不同 SKU = 不同包装/订货单位(箱/包/lb)';
comment on column products.pack_contains_qty is
  '本包装相对族内基准单位的含量。例:箱=4 表示 1 case 含 4 bag';

-- 同族内订货单位唯一(一箱一个 SKU、一包一个 SKU)
create unique index uniq_family_ordering_uom
  on products (family_id, ordering_uom)
  where family_id is not null and is_active;

create index idx_products_family on products (family_id);

alter table product_families enable row level security;

create policy product_families_select on product_families
  for select to authenticated using (true);

create policy product_families_write on product_families
  for all to authenticated
  using (public.has_role(array['admin', 'purchasing', 'it', 'sales_manager']::app_role[]))
  with check (public.has_role(array['admin', 'purchasing', 'it', 'sales_manager']::app_role[]));

-- 演示:大蒜原产品 + 箱装/包装两个 SKU
insert into product_families (code, name, notes) values
  ('GARLIC', '大蒜 / Garlic', '1 case = 4 bags; 可按箱或按包销售');

insert into products (
  sku, name, temp_zone, is_catch_weight, ordering_uom, pricing_uom,
  avg_weight_lb, current_price, inspection_method, shelf_life_days,
  family_id, pack_contains_qty
)
select
  'GARLIC-CASE', '大蒜(箱)', 'ambient', false, 'case', 'case',
  null, 24.00, 'skip', 90,
  f.id, 4
from product_families f where f.code = 'GARLIC';

insert into products (
  sku, name, temp_zone, is_catch_weight, ordering_uom, pricing_uom,
  avg_weight_lb, current_price, inspection_method, shelf_life_days,
  family_id, pack_contains_qty
)
select
  'GARLIC-BAG', '大蒜(包)', 'ambient', false, 'bag', 'bag',
  null, 6.50, 'skip', 90,
  f.id, 1
from product_families f where f.code = 'GARLIC';
