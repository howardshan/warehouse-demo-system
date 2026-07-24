-- ============================================================
-- Seed: supabase/seed.sql
-- 目的:   开发/演示用主数据（Demo v1，面向食品分销商场景）。
--          品类：肉类/海鲜/生鲜/干货/酱料/冷冻/饮料/纸品耗材；
--          客群：DFW 地区餐厅（均为虚构，不含真实客户隐私）。
-- 注意:   迁移 0020/0026 已内置 GARLIC 原产品与两个 SKU、
--          0032 已内置基础商品分类；本文件只补充、不重复。
-- 关联文档: /docs/runbook/migrations.md
-- ============================================================

-- ------------------------------------------------------------
-- 1. 储位
--    固定拣货位一品一位；按温区分区编码：
--    PF-R=常温拣货位  PF-A=冷藏拣货位  PF-F=冷冻拣货位
-- ------------------------------------------------------------
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

-- 批量扩充拣货位（常温 R02–R32、冷藏 A03–A26、冷冻 F02–F10）
insert into locations (code, type, temp_zone)
select 'PF-R' || lpad(i::text, 2, '0'), 'pick_face', 'ambient'::temp_zone
from generate_series(2, 32) i;

insert into locations (code, type, temp_zone)
select 'PF-A' || lpad(i::text, 2, '0'), 'pick_face', 'chilled'::temp_zone
from generate_series(3, 26) i;

insert into locations (code, type, temp_zone)
select 'PF-F' || lpad(i::text, 2, '0'), 'pick_face', 'frozen'::temp_zone
from generate_series(2, 10) i;

-- 储备/溢库/集货/隔离/月台补齐三温区
insert into locations (code, type, temp_zone)
select 'RS-R-' || lpad(i::text, 2, '0'), 'reserve', 'ambient'::temp_zone
from generate_series(1, 6) i;

insert into locations (code, type, temp_zone)
select 'RS-C-' || lpad(i::text, 2, '0'), 'reserve', 'chilled'::temp_zone
from generate_series(3, 8) i;

insert into locations (code, type, temp_zone)
select 'RS-F-' || lpad(i::text, 2, '0'), 'reserve', 'frozen'::temp_zone
from generate_series(2, 6) i;

insert into locations (code, type, temp_zone) values
  ('OV-02', 'overflow', 'ambient'),
  ('OV-03', 'overflow', 'frozen'),
  ('STG-02', 'staging', 'ambient'),
  ('STG-03', 'staging', 'frozen'),
  ('Q-02', 'quarantine', 'ambient'),
  ('Q-03', 'quarantine', 'frozen'),
  ('DOCK-2', 'receiving_dock', 'chilled');

-- ------------------------------------------------------------
-- 2. 周转筐
-- ------------------------------------------------------------
insert into totes (code)
select chr(64 + g) || lpad(i::text, 2, '0')
from generate_series(1, 4) g, generate_series(1, 6) i;  -- A01–D06 共 24 个

-- ------------------------------------------------------------
-- 3. 供应商
-- ------------------------------------------------------------
insert into suppliers (name, contact, phone) values
  ('Pacific Seafood Co', 'Amy Chen', '555-0101'),
  ('Valley Produce', 'Bob Lee', '555-0102'),
  ('Frozen Farms Inc', 'Chris Park', '555-0103'),
  ('Lone Star Meats', 'Dan Rodriguez', '555-0104'),
  ('DFW Poultry & Dairy', 'Elena Torres', '555-0105'),
  ('Hill Country Dry Goods', 'Frank Miller', '555-0106'),
  ('Golden Wok Asian Foods', 'Grace Liu', '555-0107'),
  ('Metro Paper & Packaging', 'Henry Adams', '555-0108'),
  ('Sunrise Beverage', 'Ivy Nguyen', '555-0109');

-- ------------------------------------------------------------
-- 4. 商品分类（0032 已建猪/牛/羊/鸡/鸭/甜品/蔬菜/酱料/米/面/打包耗材，此处补充）
-- ------------------------------------------------------------
insert into product_categories (code, name, sort_order) values
  ('SEAFOOD', '海鲜 / Seafood', 15),
  ('DAIRY', '蛋奶 / Dairy & Eggs', 55),
  ('FROZENFOOD', '冷冻食品 / Frozen Foods', 65),
  ('DRYGOODS', '干货 / Dry Goods', 95),
  ('BEVERAGE', '饮料 / Beverages', 105)
on conflict (code) do nothing;

-- ------------------------------------------------------------
-- 5. 原产品（product_families）
--    每族绑定供应商与分类；purchase_uom 为该族唯一采购单位；
--    称重族 is_catch_weight = true（盲收/发票必录重量）。
-- ------------------------------------------------------------
with fam (code, name, supplier_name, category_code, purchase_uom, is_catch_weight) as (
  values
    -- 海鲜（冷藏）
    ('SALMON',       '三文鱼(整条) / Whole Salmon',        'Pacific Seafood Co',      'SEAFOOD',    'case', true),
    ('TILAPIA',      '罗非鱼(整条) / Whole Tilapia',       'Pacific Seafood Co',      'SEAFOOD',    'case', true),
    ('SHRIMP-FR',    '鲜虾(去头) / Fresh Shrimp HLSO',     'Pacific Seafood Co',      'SEAFOOD',    'case', true),
    -- 牛/猪/羊（冷藏称重）
    ('BEEF-BRISKET', '牛腩(整块) / Beef Brisket',          'Lone Star Meats',         'BEEF',       'case', true),
    ('BEEF-RIBEYE',  '肉眼牛排 / Beef Ribeye',             'Lone Star Meats',         'BEEF',       'case', true),
    ('BEEF-FLANK',   '牛腹肉 / Beef Flank',                'Lone Star Meats',         'BEEF',       'case', true),
    ('PORK-BUTT',    '猪梅头肉 / Pork Butt',               'Lone Star Meats',         'PORK',       'case', true),
    ('PORK-BELLY',   '五花肉 / Pork Belly',                'Lone Star Meats',         'PORK',       'case', true),
    ('PORK-RIBS',    '猪肋排 / Pork Spare Ribs',           'Lone Star Meats',         'PORK',       'case', true),
    ('LAMB-RACK',    '羊排 / Lamb Rack',                   'Lone Star Meats',         'LAMB',       'case', true),
    -- 禽/蛋奶（冷藏）
    ('CHK-BREAST',   '鸡胸肉 / Chicken Breast',            'DFW Poultry & Dairy',     'CHICKEN',    'case', true),
    ('CHK-WING',     '鸡翅 / Chicken Wings',               'DFW Poultry & Dairy',     'CHICKEN',    'case', true),
    ('CHK-WHOLE',    '整鸡 / Whole Chicken',               'DFW Poultry & Dairy',     'CHICKEN',    'case', true),
    ('DUCK-WHOLE',   '整鸭 / Whole Duck',                  'DFW Poultry & Dairy',     'DUCK',       'case', true),
    ('EGGS-LARGE',   '大号鸡蛋 / Large Eggs 15dz',         'DFW Poultry & Dairy',     'DAIRY',      'case', false),
    ('BUTTER',       '黄油 / Butter Solids',               'DFW Poultry & Dairy',     'DAIRY',      'case', false),
    ('CREAM-CHEESE', '奶油芝士 / Cream Cheese',            'DFW Poultry & Dairy',     'DAIRY',      'case', false),
    -- 蔬菜生鲜
    ('GINGER',        '生姜 / Ginger',                     'Valley Produce',          'VEG',        'case', false),
    ('NAPA',          '大白菜 / Napa Cabbage',             'Valley Produce',          'VEG',        'case', false),
    ('BOKCHOY',       '上海青 / Bok Choy',                 'Valley Produce',          'VEG',        'case', false),
    ('GREEN-ONION',   '香葱 / Green Onion',                'Valley Produce',          'VEG',        'case', false),
    ('JALAPENO',      '墨西哥辣椒 / Jalapeno',             'Valley Produce',          'VEG',        'case', false),
    ('ONION-YELLOW',  '黄洋葱 / Yellow Onion 50lb',        'Valley Produce',          'VEG',        'bag',  false),
    ('POTATO-RUSSET', '褐土豆 / Russet Potato 50lb',       'Valley Produce',          'VEG',        'bag',  false),
    ('TOMATO',        '番茄 / Tomato',                     'Valley Produce',          'VEG',        'case', false),
    ('CILANTRO',      '香菜 / Cilantro',                   'Valley Produce',          'VEG',        'case', false),
    ('LIMES',         '青柠 / Limes 200ct',                'Valley Produce',          'VEG',        'case', false),
    -- 米面干货
    ('RICE-JASMINE',  '茉莉香米 / Jasmine Rice 50lb',      'Hill Country Dry Goods',  'RICE',       'bag',  false),
    ('RICE-CALROSE',  '珍珠米 / Calrose Rice 50lb',        'Hill Country Dry Goods',  'RICE',       'bag',  false),
    ('NOODLE-RICE',   '干河粉 / Rice Noodle',              'Hill Country Dry Goods',  'NOODLE',     'case', false),
    ('NOODLE-EGG',    '鲜蛋面 / Fresh Egg Noodle',         'Hill Country Dry Goods',  'NOODLE',     'case', false),
    ('FLOUR-AP',      '中筋面粉 / AP Flour 50lb',          'Hill Country Dry Goods',  'DRYGOODS',   'bag',  false),
    -- 酱料调味
    ('SOY-SAUCE',     '生抽 / Soy Sauce 4x1gal',           'Golden Wok Asian Foods',  'SAUCE',      'case', false),
    ('OYSTER-SAUCE',  '蚝油 / Oyster Sauce 6x5lb',         'Golden Wok Asian Foods',  'SAUCE',      'case', false),
    ('SESAME-OIL',    '芝麻油 / Sesame Oil',               'Golden Wok Asian Foods',  'SAUCE',      'case', false),
    ('CHILI-OIL',     '辣椒油 / Chili Oil 6x5lb',          'Golden Wok Asian Foods',  'SAUCE',      'case', false),
    ('HOISIN',        '海鲜酱 / Hoisin Sauce 6x5lb',       'Golden Wok Asian Foods',  'SAUCE',      'case', false),
    ('SRIRACHA',      '是拉差 / Sriracha 12x28oz',         'Golden Wok Asian Foods',  'SAUCE',      'case', false),
    ('RICE-VINEGAR',  '米醋 / Rice Vinegar 4x1gal',        'Golden Wok Asian Foods',  'SAUCE',      'case', false),
    ('MSG',           '味精 / MSG 25lb',                   'Golden Wok Asian Foods',  'DRYGOODS',   'bag',  false),
    ('SUGAR',         '白砂糖 / Sugar 50lb',               'Golden Wok Asian Foods',  'DRYGOODS',   'bag',  false),
    -- 冷冻
    ('SHRIMP-IQF',    '冻虾 / IQF Shrimp 5lb',             'Frozen Farms Inc',        'SEAFOOD',    'case', false),
    ('DUMPLING-PORK', '猪肉饺子 / Pork Dumplings 200ct',   'Frozen Farms Inc',        'FROZENFOOD', 'case', false),
    ('SPRINGROLL-VEG','素春卷 / Veg Spring Rolls 100ct',   'Frozen Farms Inc',        'FROZENFOOD', 'case', false),
    ('EDAMAME',       '毛豆 / Edamame 20x1lb',             'Frozen Farms Inc',        'FROZENFOOD', 'case', false),
    ('FRIES',         '薯条 / Fries 6x5lb',                'Frozen Farms Inc',        'FROZENFOOD', 'case', false),
    ('TEMPURA-SHRIMP','天妇罗虾 / Tempura Shrimp 10lb',    'Frozen Farms Inc',        'FROZENFOOD', 'case', false),
    ('MOCHI-ICE',     '麻薯冰淇淋 / Mochi Ice Cream',      'Frozen Farms Inc',        'DESSERT',    'case', false),
    ('CHEESECAKE',    '芝士蛋糕 / Cheesecake 14-slice',    'Frozen Farms Inc',        'DESSERT',    'case', false),
    -- 饮料
    ('TEA-JASMINE',   '茉莉茶包 / Jasmine Tea 100ct',      'Sunrise Beverage',        'BEVERAGE',   'case', false),
    ('SODA-COLA',     '可乐罐装 / Cola 24ct',              'Sunrise Beverage',        'BEVERAGE',   'case', false),
    ('WATER',         '瓶装水 / Water 24ct',               'Sunrise Beverage',        'BEVERAGE',   'case', false),
    ('BOBA-TAPIOCA',  '珍珠粉圆 / Tapioca Pearls 6x6lb',   'Sunrise Beverage',        'BEVERAGE',   'case', false),
    -- 打包耗材
    ('TOGO-BOX-8',    '8寸打包盒 / #8 To-Go Box 200ct',    'Metro Paper & Packaging', 'PACKAGING',  'case', false),
    ('CHOPSTICKS',    '一次性筷子 / Chopsticks 3000ct',    'Metro Paper & Packaging', 'PACKAGING',  'case', false),
    ('NAPKINS',       '餐巾纸 / Napkins 5000ct',           'Metro Paper & Packaging', 'PACKAGING',  'case', false),
    ('CUP-16OZ',      '16oz杯 / Cups 1000ct',              'Metro Paper & Packaging', 'PACKAGING',  'case', false),
    ('LID-16OZ',      '16oz杯盖 / Lids 1000ct',            'Metro Paper & Packaging', 'PACKAGING',  'case', false),
    ('TSHIRT-BAG',    '背心袋 / T-Shirt Bags 1000ct',      'Metro Paper & Packaging', 'PACKAGING',  'case', false),
    ('GLOVES-L',      '一次性手套L / Vinyl Gloves 1000ct', 'Metro Paper & Packaging', 'PACKAGING',  'case', false),
    ('FOIL-18',       '锡纸卷18寸 / Foil Roll 18in',       'Metro Paper & Packaging', 'PACKAGING',  'case', false)
)
insert into product_families (code, name, supplier_id, category_id, purchase_uom, is_catch_weight)
select f.code, f.name, s.id, c.id, f.purchase_uom, f.is_catch_weight
from fam f
join suppliers s on s.name = f.supplier_name
left join product_categories c on c.code = f.category_code;

-- GARLIC 族与 SKU：本地由迁移 0020/0026 内置；若目标库业务数据被清空则补建（幂等）
insert into product_families (code, name, supplier_id, category_id, purchase_uom, is_catch_weight, notes)
select 'GARLIC', '大蒜 / Garlic', s.id, c.id, 'case', false, '1 case = 4 bags; 可按箱或按包销售'
from suppliers s, product_categories c
where s.name = 'Valley Produce' and c.code = 'VEG'
on conflict (code) do nothing;

insert into products (
  sku, name, temp_zone, is_catch_weight, ordering_uom, pricing_uom,
  avg_weight_lb, current_price, inspection_method, shelf_life_days,
  family_id, pack_contains_qty, is_purchasable, is_sellable
)
select v.sku, v.name, 'ambient'::temp_zone, false, v.uom, v.uom,
       null, v.price, 'skip'::inspection_method, 90,
       f.id, v.pack, v.purchasable, true
from (values
  ('GARLIC-CASE', '大蒜(箱)', 'case', 24.00, 1, true),
  ('GARLIC-BAG',  '大蒜(包)', 'bag',   6.50, 4, false)
) as v(sku, name, uom, price, pack, purchasable)
join product_families f on f.code = 'GARLIC'
on conflict (sku) do nothing;

-- 迁移 0020 内置的 GARLIC 族：补供应商与分类
update product_families f
set supplier_id = s.id,
    category_id = c.id
from suppliers s, product_categories c
where f.code = 'GARLIC'
  and s.name = 'Valley Produce'
  and c.code = 'VEG'
  and f.supplier_id is null;

-- ------------------------------------------------------------
-- 6. 商品（SKU）
--    称重品：ordering=case, pricing=lb, avg_weight_lb 仅为预估。
--    每 SKU 绑定与温区匹配的固定拣货位。
-- ------------------------------------------------------------
with prod (sku, name, family_code, temp_zone, is_catch_weight, ordering_uom, pricing_uom,
           avg_weight_lb, current_price, inspection_method, shelf_life_days,
           pack_contains_qty, is_purchasable, pick_code) as (
  values
    -- 海鲜（冷藏，称重）
    ('SAL-WS-40',   'Whole Salmon',            'SALMON',        'chilled', true,  'case', 'lb',   40,   3.50, 'sampling', 5,    1, true,  'PF-A01'),
    ('TIL-WS-30',   'Whole Tilapia',           'TILAPIA',       'chilled', true,  'case', 'lb',   30,   2.20, 'sampling', 5,    1, true,  'PF-A03'),
    ('SHR-HLSO-20', 'Fresh Shrimp HLSO 16/20', 'SHRIMP-FR',     'chilled', true,  'case', 'lb',   20,   5.80, 'full',     4,    1, true,  'PF-A04'),
    -- 牛/猪/羊（冷藏，称重）
    ('BF-BRSK-60',  'Beef Brisket',            'BEEF-BRISKET',  'chilled', true,  'case', 'lb',   60,   3.20, 'skip',     7,    1, true,  'PF-A05'),
    ('BF-RBY-25',   'Beef Ribeye',             'BEEF-RIBEYE',   'chilled', true,  'case', 'lb',   25,   8.50, 'skip',     10,   1, true,  'PF-A06'),
    ('BF-FLK-30',   'Beef Flank',              'BEEF-FLANK',    'chilled', true,  'case', 'lb',   30,   6.20, 'skip',     7,    1, true,  'PF-A07'),
    ('PK-BUTT-64',  'Pork Butt',               'PORK-BUTT',     'chilled', true,  'case', 'lb',   64,   1.85, 'skip',     7,    1, true,  'PF-A08'),
    ('PK-BLY-50',   'Pork Belly',              'PORK-BELLY',    'chilled', true,  'case', 'lb',   50,   3.40, 'skip',     7,    1, true,  'PF-A09'),
    ('PK-RIB-30',   'Pork Spare Ribs',         'PORK-RIBS',     'chilled', true,  'case', 'lb',   30,   2.95, 'skip',     7,    1, true,  'PF-A10'),
    ('LM-RCK-20',   'Lamb Rack',               'LAMB-RACK',     'chilled', true,  'case', 'lb',   20,  11.00, 'skip',     10,   1, true,  'PF-A11'),
    -- 禽/蛋奶（冷藏）
    ('CHK-BR-10',   'Chicken Breast Case',     'CHK-BREAST',    'chilled', true,  'case', 'lb',   10,   2.80, 'skip',     4,    1, true,  'PF-A02'),
    ('CHK-WG-40',   'Chicken Wings',           'CHK-WING',      'chilled', true,  'case', 'lb',   40,   2.60, 'skip',     5,    1, true,  'PF-A12'),
    ('CHK-WH-45',   'Whole Chicken',           'CHK-WHOLE',     'chilled', true,  'case', 'lb',   45,   1.90, 'skip',     6,    1, true,  'PF-A13'),
    ('DCK-WH-36',   'Whole Duck',              'DUCK-WHOLE',    'chilled', true,  'case', 'lb',   36,   3.80, 'skip',     6,    1, true,  'PF-A14'),
    ('EGG-L-15DZ',  'Large Eggs 15dz',         'EGGS-LARGE',    'chilled', false, 'case', 'case', null, 38.00, 'skip',    21,   1, true,  'PF-A15'),
    ('BTR-36X1',    'Butter Solids 36lb',      'BUTTER',        'chilled', false, 'case', 'case', null, 95.00, 'skip',    90,   1, true,  'PF-A24'),
    ('CRM-CHS-30',  'Cream Cheese 30lb',       'CREAM-CHEESE',  'chilled', false, 'case', 'case', null, 78.00, 'skip',    90,   1, true,  'PF-A25'),
    -- 蔬菜生鲜
    ('GNG-CASE',    'Ginger (Case)',           'GINGER',        'ambient', false, 'case', 'case', null, 45.00, 'skip',    30,   1, true,  'PF-R04'),
    ('GNG-BAG',     'Ginger (Bag)',            'GINGER',        'ambient', false, 'bag',  'bag',  null,  8.50, 'skip',    30,   6, false, 'PF-R05'),
    ('NAP-CS-50',   'Napa Cabbage Case',       'NAPA',          'chilled', false, 'case', 'case', null, 28.00, 'skip',    10,   1, true,  'PF-A16'),
    ('BOK-CS-30',   'Bok Choy Case',           'BOKCHOY',       'chilled', false, 'case', 'case', null, 24.00, 'skip',    7,    1, true,  'PF-A17'),
    ('GRO-CS-20',   'Green Onion Case',        'GREEN-ONION',   'chilled', false, 'case', 'case', null, 22.00, 'skip',    7,    1, true,  'PF-A18'),
    ('JAL-CS-25',   'Jalapeno Case',           'JALAPENO',      'chilled', false, 'case', 'case', null, 30.00, 'skip',    10,   1, true,  'PF-A19'),
    ('ONY-50',      'Yellow Onion 50lb',       'ONION-YELLOW',  'ambient', false, 'bag',  'bag',  null, 18.00, 'skip',    60,   1, true,  'PF-R06'),
    ('POT-50',      'Russet Potato 50lb',      'POTATO-RUSSET', 'ambient', false, 'bag',  'bag',  null, 22.00, 'skip',    45,   1, true,  'PF-R07'),
    ('TOM-CS-25',   'Tomato Case 25lb',        'TOMATO',        'chilled', false, 'case', 'case', null, 26.00, 'skip',    7,    1, true,  'PF-A20'),
    ('CIL-CS-30',   'Cilantro 30ct',           'CILANTRO',      'chilled', false, 'case', 'case', null, 28.00, 'skip',    5,    1, true,  'PF-A21'),
    ('LIM-CS-200',  'Limes 200ct',             'LIMES',         'chilled', false, 'case', 'case', null, 32.00, 'skip',    14,   1, true,  'PF-A22'),
    -- 米面干货（常温）
    ('RICE-50',     'Jasmine Rice 50lb',       'RICE-JASMINE',  'ambient', false, 'bag',  'bag',  null, 28.00, 'skip',    365,  1, true,  'PF-R01'),
    ('RICE-CAL-50', 'Calrose Rice 50lb',       'RICE-CALROSE',  'ambient', false, 'bag',  'bag',  null, 24.00, 'skip',    365,  1, true,  'PF-R08'),
    ('NDL-RICE-30', 'Rice Noodle 30x14oz',     'NOODLE-RICE',   'ambient', false, 'case', 'case', null, 36.00, 'skip',    180,  1, true,  'PF-R09'),
    ('NDL-EGG-20',  'Fresh Egg Noodle 20lb',   'NOODLE-EGG',    'chilled', false, 'case', 'case', null, 28.00, 'skip',    14,   1, true,  'PF-A23'),
    ('FLR-AP-50',   'AP Flour 50lb',           'FLOUR-AP',      'ambient', false, 'bag',  'bag',  null, 19.00, 'skip',    270,  1, true,  'PF-R10'),
    -- 酱料调味（常温）
    ('SOY-4GAL',    'Soy Sauce 4x1gal',        'SOY-SAUCE',     'ambient', false, 'case', 'case', null, 34.00, 'skip',    365,  1, true,  'PF-R11'),
    ('OYS-6X5',     'Oyster Sauce 6x5lb',      'OYSTER-SAUCE',  'ambient', false, 'case', 'case', null, 42.00, 'skip',    365,  1, true,  'PF-R12'),
    ('SES-6X56',    'Sesame Oil 6x56oz',       'SESAME-OIL',    'ambient', false, 'case', 'case', null, 58.00, 'skip',    365,  1, true,  'PF-R13'),
    ('CHL-6X5',     'Chili Oil 6x5lb',         'CHILI-OIL',     'ambient', false, 'case', 'case', null, 46.00, 'skip',    365,  1, true,  'PF-R14'),
    ('HOI-6X5',     'Hoisin Sauce 6x5lb',      'HOISIN',        'ambient', false, 'case', 'case', null, 38.00, 'skip',    365,  1, true,  'PF-R15'),
    ('SRI-12X28',   'Sriracha 12x28oz',        'SRIRACHA',      'ambient', false, 'case', 'case', null, 36.00, 'skip',    365,  1, true,  'PF-R16'),
    ('VIN-4GAL',    'Rice Vinegar 4x1gal',     'RICE-VINEGAR',  'ambient', false, 'case', 'case', null, 26.00, 'skip',    365,  1, true,  'PF-R17'),
    ('MSG-25',      'MSG 25lb',                'MSG',           'ambient', false, 'bag',  'bag',  null, 32.00, 'skip',    720,  1, true,  'PF-R18'),
    ('SUG-50',      'Sugar 50lb',              'SUGAR',         'ambient', false, 'bag',  'bag',  null, 27.00, 'skip',    540,  1, true,  'PF-R19'),
    -- 冷冻
    ('SHR-IQF-5',   'IQF Shrimp 5lb',          'SHRIMP-IQF',    'frozen',  false, 'case', 'case', null, 42.00, 'full',    180,  1, true,  'PF-F01'),
    ('DMP-PORK-200','Pork Dumplings 200ct',    'DUMPLING-PORK', 'frozen',  false, 'case', 'case', null, 52.00, 'skip',    270,  1, true,  'PF-F02'),
    ('SPR-VEG-100', 'Veg Spring Rolls 100ct',  'SPRINGROLL-VEG','frozen',  false, 'case', 'case', null, 38.00, 'skip',    270,  1, true,  'PF-F03'),
    ('EDA-20X1',    'Edamame 20x1lb',          'EDAMAME',       'frozen',  false, 'case', 'case', null, 30.00, 'skip',    365,  1, true,  'PF-F04'),
    ('FRY-6X5',     'Fries 6x5lb',             'FRIES',         'frozen',  false, 'case', 'case', null, 28.00, 'skip',    365,  1, true,  'PF-F05'),
    ('TMP-SHR-10',  'Tempura Shrimp 10lb',     'TEMPURA-SHRIMP','frozen',  false, 'case', 'case', null, 65.00, 'skip',    270,  1, true,  'PF-F06'),
    ('MCH-ICE-12',  'Mochi Ice Cream 12ct',    'MOCHI-ICE',     'frozen',  false, 'case', 'case', null, 40.00, 'skip',    365,  1, true,  'PF-F07'),
    ('CCK-PS-14',   'Cheesecake 14-slice',     'CHEESECAKE',    'frozen',  false, 'case', 'case', null, 34.00, 'skip',    270,  1, true,  'PF-F08'),
    -- 饮料（常温）
    ('TEA-JAS-100', 'Jasmine Tea 100ct',       'TEA-JASMINE',   'ambient', false, 'case', 'case', null, 22.00, 'skip',    540,  1, true,  'PF-R20'),
    ('SOD-COLA-24', 'Cola 24ct',               'SODA-COLA',     'ambient', false, 'case', 'case', null, 14.00, 'skip',    270,  1, true,  'PF-R21'),
    ('WTR-24',      'Water 24ct',              'WATER',         'ambient', false, 'case', 'case', null,  8.00, 'skip',    365,  1, true,  'PF-R22'),
    ('BOB-TAP-6X6', 'Tapioca Pearls 6x6lb',    'BOBA-TAPIOCA',  'ambient', false, 'case', 'case', null, 48.00, 'skip',    365,  1, true,  'PF-R23'),
    -- 打包耗材（常温，无效期）
    ('TGB-8-200',   '#8 To-Go Box 200ct',      'TOGO-BOX-8',    'ambient', false, 'case', 'case', null, 32.00, 'skip',    null, 1, true,  'PF-R24'),
    ('CHP-UB-3000', 'Chopsticks 3000ct',       'CHOPSTICKS',    'ambient', false, 'case', 'case', null, 28.00, 'skip',    null, 1, true,  'PF-R25'),
    ('NPK-5000',    'Napkins 5000ct',          'NAPKINS',       'ambient', false, 'case', 'case', null, 35.00, 'skip',    null, 1, true,  'PF-R26'),
    ('CUP-16-1000', 'Cups 16oz 1000ct',        'CUP-16OZ',      'ambient', false, 'case', 'case', null, 52.00, 'skip',    null, 1, true,  'PF-R27'),
    ('LID-16-1000', 'Lids 16oz 1000ct',        'LID-16OZ',      'ambient', false, 'case', 'case', null, 30.00, 'skip',    null, 1, true,  'PF-R28'),
    ('BAG-TS-1000', 'T-Shirt Bags 1000ct',     'TSHIRT-BAG',    'ambient', false, 'case', 'case', null, 24.00, 'skip',    null, 1, true,  'PF-R29'),
    ('GLV-L-1000',  'Vinyl Gloves L 1000ct',   'GLOVES-L',      'ambient', false, 'case', 'case', null, 26.00, 'skip',    null, 1, true,  'PF-R30'),
    ('FOL-18-500',  'Foil Roll 18in 500ft',    'FOIL-18',       'ambient', false, 'case', 'case', null, 28.00, 'skip',    null, 1, true,  'PF-R31')
)
insert into products (
  sku, name, temp_zone, is_catch_weight, ordering_uom, pricing_uom,
  avg_weight_lb, current_price, inspection_method, shelf_life_days,
  family_id, pack_contains_qty, is_purchasable, is_sellable,
  fixed_pick_location_id
)
select
  p.sku, p.name, p.temp_zone::temp_zone, p.is_catch_weight, p.ordering_uom, p.pricing_uom,
  p.avg_weight_lb::numeric, p.current_price::numeric, p.inspection_method::inspection_method,
  p.shelf_life_days::int, f.id, p.pack_contains_qty::numeric, p.is_purchasable, true,
  l.id
from prod p
join product_families f on f.code = p.family_code
join locations l on l.code = p.pick_code;

-- 迁移 0020 内置的 GARLIC SKU：绑定固定拣货位
update products p
set fixed_pick_location_id = l.id
from locations l
where (p.sku = 'GARLIC-CASE' and l.code = 'PF-R03')
   or (p.sku = 'GARLIC-BAG' and l.code = 'PF-R02');

-- ------------------------------------------------------------
-- 7. 客户（DFW 地区餐厅，均为虚构；覆盖各信用状态便于演示信用闸）
--    delivery_route 暂为文本；Phase A 迁移 routes 主数据后收编。
-- ------------------------------------------------------------
insert into customers (
  code, name, legal_name, credit_limit, payment_terms_days, credit_status, delivery_route
) values
  ('C-1001', 'Golden Dragon Restaurant', 'Golden Dragon LLC',        5000, 14, 'ok',              'Route-A'),
  ('C-1002', 'Harbor Sushi Bar',         'Harbor Sushi Inc',         3000,  7, 'ok',              'Route-B'),
  ('C-1003', 'COD Only Cafe',            'COD Only Cafe',               0,  0, 'cod_only',        'Route-A'),
  ('C-1004', 'Lucky Bamboo Bistro',      'Lucky Bamboo Group LLC',   7500, 21, 'ok',              'Route-A'),
  ('C-1005', 'Pho Saigon Kitchen',       'Saigon Kitchen LLC',       4000, 14, 'ok',              'Route-B'),
  ('C-1006', 'Casa Verde Taqueria',      'Casa Verde TX Inc',        3500, 14, 'ok',              'Route-C'),
  ('C-1007', 'Smokehouse BBQ Pit',       'Smokehouse Pit BBQ LLC',   6000, 21, 'ok',              'Route-C'),
  ('C-1008', 'Sakura Hibachi Express',   'Sakura Express Inc',       3000, 14, 'warning',         'Route-B'),
  ('C-1009', 'Dragon Wok Buffet',        'Dragon Wok Buffet Inc',    8000, 30, 'over_limit',      'Route-D'),
  ('C-1010', 'Plano Garden Chinese',     'Plano Garden Inc',         5000, 14, 'ok',              'Route-D'),
  ('C-1011', 'Spice Route Indian Grill', 'Spice Route DFW LLC',      4500, 14, 'ok',              'Route-C'),
  ('C-1012', 'Big Tex Diner',            'Big Tex Diner LLC',        2500,  7, 'hold_new_orders', 'Route-E'),
  ('C-1013', 'Mariscos El Puerto',       'El Puerto Mariscos LLC',   3000, 14, 'ok',              'Route-E'),
  ('C-1014', 'Noodle House 88',          'Noodle House 88 LLC',      2000,  7, 'ok',              'Route-D'),
  ('C-1015', 'Sunrise Dim Sum Palace',   'Sunrise Palace Group Inc', 9000, 30, 'ok',              'Route-A'),
  ('C-1016', 'Frisco Poke Co',           'Frisco Poke Co LLC',          0,  0, 'cod_only',        'Route-B'),
  ('C-1017', 'Bubble Tea Society',       'BT Society LLC',           1500,  7, 'ok',              'Route-E'),
  ('C-1018', 'Lakeside Grill & Cantina', 'Lakeside Cantina Inc',     2000, 14, 'full_block',      'Route-C');

-- 地址（每客户一个默认送货地址，带送货时间窗）
with addr (customer_code, address, delivery_window) as (
  values
    ('C-1001', '123 Main St, Plano, TX 75074',            '06:00-10:00'),
    ('C-1002', '45 Harbor Ave, Frisco, TX 75034',         '07:00-11:00'),
    ('C-1003', '900 Elm St, Plano, TX 75074',             '08:00-12:00'),
    ('C-1004', '2201 Coit Rd, Plano, TX 75075',           '06:00-09:00'),
    ('C-1005', '1830 N Jupiter Rd, Garland, TX 75042',    '07:00-11:00'),
    ('C-1006', '415 W Belt Line Rd, Richardson, TX 75080','08:00-12:00'),
    ('C-1007', '3300 Custer Rd, McKinney, TX 75070',      '06:00-10:00'),
    ('C-1008', '5720 Legacy Dr, Frisco, TX 75034',        '09:00-13:00'),
    ('C-1009', '1120 E Spring Valley Rd, Richardson, TX 75081', '06:00-10:00'),
    ('C-1010', '700 Parker Rd, Plano, TX 75023',          '07:00-11:00'),
    ('C-1011', '2540 Old Denton Rd, Carrollton, TX 75006','08:00-12:00'),
    ('C-1012', '150 S Central Expy, Allen, TX 75013',     '05:00-08:00'),
    ('C-1013', '3901 W Walnut St, Garland, TX 75042',     '07:00-11:00'),
    ('C-1014', '88 Legacy Cir, Plano, TX 75024',          '09:00-13:00'),
    ('C-1015', '1409 K Ave, Plano, TX 75074',             '05:00-09:00'),
    ('C-1016', '9250 Dallas Pkwy, Frisco, TX 75033',      '08:00-12:00'),
    ('C-1017', '2205 N Josey Ln, Carrollton, TX 75006',   '10:00-14:00'),
    ('C-1018', '600 E Lake Hwy, Rockwall, TX 75087',      '08:00-12:00')
)
insert into customer_addresses (customer_id, label, address, is_default, delivery_window)
select c.id, 'Main', a.address, true, a.delivery_window
from addr a
join customers c on c.code = a.customer_code;

-- 联系人（每客户一个订货联系人）
with ct (customer_code, name, phone) as (
  values
    ('C-1001', 'Manager Wong', '555-1001'),
    ('C-1002', 'Kenji Sato', '555-1002'),
    ('C-1003', 'Dana Reed', '555-1003'),
    ('C-1004', 'Lily Zhang', '555-1004'),
    ('C-1005', 'Minh Tran', '555-1005'),
    ('C-1006', 'Rosa Delgado', '555-1006'),
    ('C-1007', 'Hank Colton', '555-1007'),
    ('C-1008', 'Yuki Tanaka', '555-1008'),
    ('C-1009', 'Peter Chan', '555-1009'),
    ('C-1010', 'Mei Lin', '555-1010'),
    ('C-1011', 'Raj Patel', '555-1011'),
    ('C-1012', 'Earl Watts', '555-1012'),
    ('C-1013', 'Carlos Rivera', '555-1013'),
    ('C-1014', 'Ada Kwan', '555-1014'),
    ('C-1015', 'Uncle Fong', '555-1015'),
    ('C-1016', 'Tyler Brooks', '555-1016'),
    ('C-1017', 'Joyce Ho', '555-1017'),
    ('C-1018', 'Nina Alvarez', '555-1018')
)
insert into customer_contacts (customer_id, name, phone, role)
select c.id, t.name, t.phone, 'ordering'
from ct t
join customers c on c.code = t.customer_code;
