-- ============================================================
-- Migration: 0004_products.sql
-- 守护铁律: 铁律 1, 3, 7
-- 目的:   商品主档。售价是单一「当前价」(改价覆盖);
--          双单位字段强制存在;固定拣货位外键支撑两级储位。
--          avg_weight_lb 仅用于预估,严禁填充实重字段。
-- 关联文档: /docs/modules/01-master-data.md
-- 关联 ADR: /docs/decisions/0001-price-snapshot.md
--           /docs/decisions/0008-dual-uom-catch-weight.md
-- 回滚:   drop table products;
-- ============================================================

create table products (
  id                     uuid primary key default gen_random_uuid(),
  sku                    text unique not null,
  name                   text not null,
  temp_zone              temp_zone not null,

  -- 双单位 (铁律 3)
  is_catch_weight        boolean not null default false,
  ordering_uom           text not null,
  pricing_uom            text not null,
  avg_weight_lb          numeric,
  -- ⚠️ 严禁用 avg_weight_lb 填充任何实重字段

  -- 售价:单一当前价,改价即覆盖 (铁律 1)
  current_price          numeric not null check (current_price >= 0),

  inspection_method      inspection_method not null default 'skip',
  fixed_pick_location_id uuid references locations(id),
  shelf_life_days        int check (shelf_life_days is null or shelf_life_days > 0),
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint catch_weight_needs_two_uoms
    check (not is_catch_weight or ordering_uom <> pricing_uom),

  constraint catch_weight_pricing_is_lb
    check (not is_catch_weight or pricing_uom = 'lb'),

  constraint avg_weight_only_for_catch_weight
    check (
      (is_catch_weight and avg_weight_lb is not null and avg_weight_lb > 0)
      or (not is_catch_weight and avg_weight_lb is null)
    )
);

create trigger trg_products_updated_at
  before update on products
  for each row execute function public.handle_updated_at();

create index idx_products_active on products (is_active);
create index idx_products_sku on products (sku);
