-- ============================================================
-- Migration: 0035_routes.sql
-- 守护铁律: —（新增配送路线主数据，为 Phase A 路线配送打底）
-- 目的:   配送路线主数据 + 客户绑定路线与站序。
--          路线 = 编号 + 配送日(周几) + 默认司机/车辆 + 截单时间；
--          客户绑定到一条路线，并有该线上的站点顺序(route_stop_seq)，
--          供后续「按站序倒序装车」使用。
--          delivery_route 文本列暂保留(应用层过渡)，route_id 为真正绑定。
-- 关联文档: /docs/modules/07-shipping.md
-- 回滚:   alter table customers drop column route_id, route_stop_seq;
--          drop table routes; delete from permissions where key='warehouse.routes.write';
-- ============================================================

-- 1) 路线主数据
create table routes (
  id                 uuid primary key default gen_random_uuid(),
  code               text unique not null,
  name               text not null,
  -- 配送日：0=周日 … 6=周六（与 JS Date.getDay() 一致）
  delivery_weekday   int not null check (delivery_weekday between 0 and 6),
  default_driver_id  uuid references user_profiles(id),
  default_vehicle    text,
  -- 截单时间(可选)：晚于该时刻的订单进入下一个配送日；null 表示用系统默认
  cutoff_time        time,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column routes.delivery_weekday is '配送日：0=周日…6=周六（JS getDay）';
comment on column routes.cutoff_time is '截单时刻；晚于此的订单顺延到下个配送日（null=用系统默认 order_cutoff_time）';

create trigger trg_routes_updated_at
  before update on routes
  for each row execute function public.handle_updated_at();

create trigger trg_audit_routes
  after insert or update or delete on routes
  for each row execute function public.fn_audit_row();

create index idx_routes_active on routes (is_active);

-- 2) 客户绑定路线 + 站序
alter table customers
  add column route_id uuid references routes(id),
  add column route_stop_seq int check (route_stop_seq is null or route_stop_seq > 0);

comment on column customers.route_id is '所属配送路线';
comment on column customers.route_stop_seq is '该客户在路线上的站点顺序（1=第一站）；装车按此倒序（后送先装）';

-- 同一路线内站序唯一（允许多个客户未排序 route_stop_seq is null）
create unique index uniq_route_stop_seq
  on customers (route_id, route_stop_seq)
  where route_id is not null and route_stop_seq is not null;

create index idx_customers_route on customers (route_id);

-- 3) 权限点
insert into permissions (key, module, description) values
  ('warehouse.routes.write', 'warehouse', '管理配送路线与客户站序')
on conflict (key) do nothing;

-- 角色默认：仓库可管理路线（admin 运行时全开，无需行）
insert into role_permissions (role, permission_key) values
  ('warehouse'::app_role, 'warehouse.routes.write')
on conflict (role, permission_key) do nothing;

-- 4) 演示种子：5 条路线（周一至周五）
insert into routes (code, name, delivery_weekday, default_vehicle) values
  ('RTE-A', '周一 · Plano 线',        1, 'TRUCK-01'),
  ('RTE-B', '周二 · Frisco 线',       2, 'TRUCK-02'),
  ('RTE-C', '周三 · Richardson 线',   3, 'TRUCK-03'),
  ('RTE-D', '周四 · North Dallas 线', 4, 'TRUCK-04'),
  ('RTE-E', '周五 · East 线',         5, 'TRUCK-05')
on conflict (code) do nothing;

-- 5) 回填：把客户的 delivery_route 文本('Route-A'…) 映射到 route_id，
--    并按客户编码顺序在每条线内排定站序。
update customers c
set route_id = r.id
from routes r
where c.route_id is null
  and c.delivery_route is not null
  and r.code = 'RTE-' || right(c.delivery_route, 1);

with seq as (
  select id,
         row_number() over (partition by route_id order by code) as rn
  from customers
  where route_id is not null
)
update customers c
set route_stop_seq = seq.rn
from seq
where c.id = seq.id
  and c.route_stop_seq is null;

-- 6) RLS：路线读对所有登录用户开放（主数据），写需 warehouse.routes.write
alter table routes enable row level security;

create policy routes_select on routes
  for select to authenticated using (true);

create policy routes_write on routes
  for all to authenticated
  using (public.user_has_permission('warehouse.routes.write'))
  with check (public.user_has_permission('warehouse.routes.write'));
