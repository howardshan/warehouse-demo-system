-- ============================================================
-- Seed: supabase/seed.sql
-- 目的:   开发/演示用主数据。不含真实客户隐私。
-- 关联文档: /docs/runbook/migrations.md
-- ============================================================

-- 储位
insert into locations (code, type, temp_zone) values
  ('PF-A01', 'pick_face', 'chilled'),
  ('PF-A02', 'pick_face', 'chilled'),
  ('PF-F01', 'pick_face', 'frozen'),
  ('PF-R01', 'pick_face', 'ambient'),
  ('RS-C-01', 'reserve', 'chilled'),
  ('RS-C-02', 'reserve', 'chilled'),
  ('RS-F-01', 'reserve', 'frozen'),
  ('OV-01', 'overflow', 'chilled'),
  ('STG-01', 'staging', 'chilled'),
  ('Q-01', 'quarantine', 'chilled'),
  ('DOCK-1', 'receiving_dock', 'ambient');

-- 周转筐
insert into totes (code) values
  ('A01'), ('A02'), ('A03'), ('B01'), ('B02'), ('C01');

-- 供应商
insert into suppliers (name, contact, phone) values
  ('Pacific Seafood Co', 'Amy Chen', '555-0101'),
  ('Valley Produce', 'Bob Lee', '555-0102'),
  ('Frozen Farms Inc', 'Chris Park', '555-0103');

-- 商品(固定拣货位稍后用 update 绑)
insert into products (
  sku, name, temp_zone, is_catch_weight, ordering_uom, pricing_uom,
  avg_weight_lb, current_price, inspection_method, shelf_life_days
) values
  ('SAL-WS-40', 'Whole Salmon', 'chilled', true, 'case', 'lb', 40, 3.50, 'sampling', 5),
  ('CHK-BR-10', 'Chicken Breast Case', 'chilled', true, 'case', 'lb', 10, 2.80, 'skip', 4),
  ('RICE-50', 'Jasmine Rice 50lb', 'ambient', false, 'bag', 'bag', null, 28.00, 'skip', 365),
  ('SHR-IQF-5', 'IQF Shrimp 5lb', 'frozen', false, 'case', 'case', null, 42.00, 'full', 180);

update products p
set fixed_pick_location_id = l.id
from locations l
where (p.sku = 'SAL-WS-40' and l.code = 'PF-A01')
   or (p.sku = 'CHK-BR-10' and l.code = 'PF-A02')
   or (p.sku = 'RICE-50' and l.code = 'PF-R01')
   or (p.sku = 'SHR-IQF-5' and l.code = 'PF-F01');

-- 客户
insert into customers (
  code, name, legal_name, credit_limit, payment_terms_days,
  credit_status, delivery_route
) values
  ('C-1001', 'Golden Dragon Restaurant', 'Golden Dragon LLC', 5000, 14, 'ok', 'Route-A'),
  ('C-1002', 'Harbor Sushi Bar', 'Harbor Sushi Inc', 3000, 7, 'ok', 'Route-B'),
  ('C-1003', 'COD Only Cafe', 'COD Only Cafe', 0, 0, 'cod_only', 'Route-A');

insert into customer_addresses (customer_id, label, address, is_default, delivery_window)
select id, 'Main', '123 Main St, City', true, '06:00-10:00'
from customers where code = 'C-1001';

insert into customer_addresses (customer_id, label, address, is_default, delivery_window)
select id, 'Main', '45 Harbor Ave, City', true, '07:00-11:00'
from customers where code = 'C-1002';

insert into customer_contacts (customer_id, name, phone, role)
select id, 'Manager Wong', '555-1001', 'ordering'
from customers where code = 'C-1001';
