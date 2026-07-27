-- 订单单据打印状态（下货单 / invoice）
alter table sales_orders
  add column delivery_note_printed_at timestamptz,
  add column invoice_printed_at       timestamptz;
