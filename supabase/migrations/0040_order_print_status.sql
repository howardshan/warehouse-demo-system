-- ============================================================
-- Migration: 0040_order_print_status.sql
-- 守护铁律: —
-- 目的:   记录订单下货单 / invoice 的打印时间。
--          （原 0037_order_print_status，重编为 0040）
-- 关联文档: /docs/modules/05-sales-orders.md
-- 回滚: alter table sales_orders drop column delivery_note_printed_at, drop column invoice_printed_at;
-- ============================================================

-- 订单单据打印状态（下货单 / invoice）
alter table sales_orders
  add column delivery_note_printed_at timestamptz,
  add column invoice_printed_at       timestamptz;
