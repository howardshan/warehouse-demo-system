-- ============================================================
-- Migration: 0036_trip_route_shipping.sql
-- 守护铁律: —（打通「配送行程」与「配送路线」「发运单」）
-- 目的:   趟次(delivery_trips) 关联到一条路线并记录车辆；
--          发运单(shipping_lists) 可挂到某个趟次(delivery_trip_id)。
--          于是一个趟次 = 某司机某天按某条路线送这些发运单（+ 顺路取回退货）。
--          为 Step3「按站序倒序装车」铺路。
-- 关联文档: /docs/modules/07-shipping.md
-- 回滚:   alter table shipping_lists drop column delivery_trip_id;
--          alter table delivery_trips drop column route_id, vehicle;
-- ============================================================

-- 1) 趟次关联路线 + 车辆
alter table delivery_trips
  add column route_id uuid references routes(id),
  add column vehicle  text;

comment on column delivery_trips.route_id is '本趟次执行的配送路线（决定客户站序）';
comment on column delivery_trips.vehicle is '本趟次车辆（默认取路线 default_vehicle，可改）';

create index idx_delivery_trips_route on delivery_trips (route_id, trip_date);

-- 2) 发运单挂到趟次
alter table shipping_lists
  add column delivery_trip_id uuid references delivery_trips(id);

comment on column shipping_lists.delivery_trip_id is '所属配送趟次；装车/送货按趟次组织';

create index idx_shipping_lists_trip on shipping_lists (delivery_trip_id);

-- 说明：不新增 RLS —— 新列继承各自表的既有策略。
-- delivery_trips 写 = warehouse.shipping.write；shipping_lists 写 = warehouse.shipping.write（见 0033）。
-- 更新 delivery_trip_id 不改 status，不触发发运状态机护栏。
