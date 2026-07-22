-- ============================================================
-- Migration: 0028_supplier_invoice_on_gr.sql
-- 守护铁律: 铁律 13
-- 目的:   采购收货独立录入 Shipping List(送货单) 与 Invoice(发票)；
--          送货单用 supplier_claimed_units，发票用 invoice_claimed_units。
-- 关联文档: /docs/modules/02-purchasing-receiving.md
-- ============================================================

alter table goods_receipts
  add column if not exists supplier_invoice_no text;

comment on column goods_receipts.supplier_document_no is
  '供应商 Shipping List / 送货单号';
comment on column goods_receipts.supplier_invoice_no is
  '供应商 Invoice / 发票号';

alter table gr_lines
  add column if not exists invoice_claimed_units numeric not null default 0
  check (invoice_claimed_units >= 0);

comment on column gr_lines.supplier_claimed_units is
  'Shipping List / 送货单声称件数';
comment on column gr_lines.invoice_claimed_units is
  'Invoice / 发票声称件数';
