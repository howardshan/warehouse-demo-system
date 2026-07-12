-- ============================================================
-- Migration: 0001_enums.sql
-- 守护铁律: 铁律 3/4/7/11/14（枚举是后续约束与状态机的基础）
-- 目的:   建立全系统共用枚举。状态机与差异原因必须是枚举，
--          禁止自由文本（否则盘点/召回统计会失真）。
-- 关联文档: /docs/01-glossary.md
-- 关联 ADR: —
-- 回滚:   drop type ... cascade;（仅开发期；生产禁止）
-- ============================================================

create type temp_zone as enum ('ambient', 'chilled', 'frozen');
create type inspection_method as enum ('skip', 'sampling', 'full');
create type location_type as enum (
  'pick_face',
  'reserve',
  'overflow',
  'staging',
  'quarantine',
  'receiving_dock'
);
create type batch_status as enum ('quality_hold', 'available', 'blocked', 'depleted');
create type po_status as enum (
  'draft',
  'issued',
  'partially_received',
  'received',
  'closed',
  'cancelled'
);
create type gr_status as enum ('draft', 'submitted', 'matched', 'discrepancy', 'posted');
create type so_status as enum (
  'draft',
  'pending_approval',
  'credit_hold',
  'confirmed',
  'picking',
  'shipped',
  'closed',
  'cancelled'
);
create type pick_status as enum (
  'created',
  'picking',
  'picked_pending_weight',
  'weighed',
  'shipped',
  'cancelled'
);
create type sl_status as enum (
  'draft',
  'pending_weight',
  'ready',
  'released',
  'in_transit',
  'signed',
  'adjusted'
);
create type customer_credit_status as enum (
  'ok',
  'warning',
  'over_limit',
  'hold_new_orders',
  'full_block',
  'cod_only'
);
create type return_type as enum ('post_delivery', 'on_delivery_rejection');
create type return_disposition as enum ('pending', 'restock', 'scrap');
create type responsibility as enum ('ours', 'customer', 'under_investigation');
create type invoice_status as enum ('pending', 'invoiced', 'void');

create type variance_reason as enum (
  'out_of_stock',
  'stock_mismatch',
  'quality_reject',
  'near_expiry',
  'underweight',
  'customer_cancelled',
  'other'
);

create type return_reason as enum (
  'quality',
  'wrong_item',
  'near_expiry',
  'over_ordered',
  'not_wanted',
  'qty_mismatch',
  'other'
);

create type app_role as enum (
  'admin',
  'purchasing',
  'warehouse',
  'sales',
  'sales_manager',
  'finance',
  'driver'
);
