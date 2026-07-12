-- ============================================================
-- Migration: 0003_locations_totes_suppliers.sql
-- 守护铁律: 铁律 7（两级储位的物理基础）
-- 目的:   储位 / 周转筐 / 供应商主数据。拣货位类型是后续
--          「一拣货位同时只能一个批号」触发器的前提。
-- 关联文档: /docs/modules/01-master-data.md
-- 关联 ADR: /docs/decisions/0002-two-tier-locations.md
-- 回滚:   drop table totes, locations, suppliers;
-- ============================================================

create table suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  contact     text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table locations (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  type        location_type not null,
  temp_zone   temp_zone not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table totes (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index idx_locations_type on locations (type) where is_active;
create index idx_suppliers_active on suppliers (is_active);
