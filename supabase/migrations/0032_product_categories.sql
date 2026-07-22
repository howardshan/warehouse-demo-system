-- ============================================================
-- Migration: 0032_product_categories.sql
-- 目的:   原产品分类主数据（可编辑），并挂到 product_families。
-- 关联文档: /docs/modules/01-master-data.md
-- ============================================================

create table if not exists product_categories (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table product_categories is
  '原产品分类：猪/牛/羊/鸡/鸭/甜品/蔬菜/酱料/米/面/打包耗材等，可维护';

insert into product_categories (code, name, sort_order) values
  ('PORK', '猪', 10),
  ('BEEF', '牛', 20),
  ('LAMB', '羊', 30),
  ('CHICKEN', '鸡', 40),
  ('DUCK', '鸭', 50),
  ('DESSERT', '甜品', 60),
  ('VEG', '蔬菜', 70),
  ('SAUCE', '酱料', 80),
  ('RICE', '米', 90),
  ('NOODLE', '面', 100),
  ('PACKAGING', '打包耗材', 110)
on conflict (code) do nothing;

alter table product_families
  add column if not exists category_id uuid references product_categories(id);

comment on column product_families.category_id is
  '原产品分类（猪/牛/蔬菜等）';

create index if not exists idx_product_families_category
  on product_families (category_id);

alter table product_categories enable row level security;

create policy product_categories_select on product_categories
  for select to authenticated using (true);

create policy product_categories_write on product_categories
  for all to authenticated
  using (public.has_role(array['admin', 'purchasing', 'it']::app_role[]))
  with check (public.has_role(array['admin', 'purchasing', 'it']::app_role[]));
