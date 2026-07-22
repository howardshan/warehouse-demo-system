# 主数据

## 1. 业务规则
- 商品以唯一 **SKU**（字母数字编码，可含 `-`/`_`）标识包装级货品；**销售产品名称**（`products.name`）面向销售/客户展示，可含中文。
- 原产品（`product_families`）有唯一 **采购单位**；包装 SKU 区分采购/销售用途（互斥，不可同时为采购且销售）。
- 原产品须绑定 **供应商**（`supplier_id`）与 **分类**（`category_id`）。同一商品不同供应商分别建档，各自包装 SKU 的卖价独立；进货价在采购单行填写。**编码全局唯一**，不同供应商也不可共用。分类可在 `/purchasing/categories` 维护（猪/牛/羊/鸡/鸭/甜品/蔬菜/酱料/米/面/打包耗材等）。
- 原产品可选 **需要称重**（`is_catch_weight`）。称重时盲收与 Invoice 必填重量；核对页按 `receiving_weight_tolerance_pct` 对 Invoice 重量 vs 实收重量做 warning（不阻断）。
- 销售/采购包装均须归属原产品，并用 `pack_contains_qty` 必填表达：**1 采购单位 = N 本包装**（采购箱本身通常为 1；如 1 case = 4 bag）。
- 原产品：新建 `/purchasing/families/new`；查询/编辑 `/purchasing/families`。
- 原产品可选填 **外包装重量** `outer_pack_weight_lb`（皮重 lb）。散卖 SKU 勾选 `requires_debox` 时：净重 = 毛重 − 采购件数 × 皮重；**整箱卖不扣**。
- 采购单仅可选 `is_purchasable` 商品，且优先限定为该 PO 供应商下的原产品包装；销售单仅可选 `is_sellable` 商品。
- 商品状态为 **上架**（`is_active=true`）或 **下架**（`is_active=false`）；下架后不可加入新销售/采购单，历史单据保留。
- 称重品订货单位与计价单位必须不同，计价单位固定为 lb；`avg_weight_lb` 仅供估算，不能写入任何实重字段。
- 供应商、储位、周转筐、用户角色和系统阈值统一作为受控主数据。
- 当前价允许覆盖，但每次变化同时进入价格历史与通用审计。

## 2. 涉及的表视图
- 表：`user_profiles`、`suppliers`、`locations`、`totes`、`products`、`settings`、`audit_log`、`price_history`。
- 角色帮助函数 `current_user_role`、`has_role` 为后续 RLS 与业务护栏提供统一身份判断。

## 3. 对应的SQL文件
- `supabase/migrations/0001_enums.sql`
- `supabase/migrations/0002_user_profiles.sql`
- `supabase/migrations/0003_locations_totes_suppliers.sql`
- `supabase/migrations/0004_products.sql`
- `supabase/migrations/0006_settings.sql`
- `supabase/migrations/0007_audit_log.sql`
- `supabase/migrations/0008_rls.sql`
- `supabase/migrations/0009_pricing_tables.sql`
- `supabase/migrations/0020_product_families_pack_variants.sql`
- `supabase/migrations/0026_purchase_vs_sell_pack_ratio.sql`
- `supabase/migrations/0027_family_outer_pack_tare.sql`
- `supabase/migrations/0029_family_supplier.sql`
- `supabase/migrations/0030_family_code_globally_unique.sql`
- `supabase/migrations/0031_family_catch_weight_receiving.sql`
- `supabase/migrations/0032_product_categories.sql`

## 4. 守护了哪些铁律
- 铁律 1：当前价与历史成交价分离，主档变价可追溯。
- 铁律 3：称重品双 UOM、lb 命名和均重用途由约束限定。
- 铁律 7：储位类型和固定拣货位为两级储位及单批号规则提供基础。

## 5. 为什么这么设计
- 主数据负责“当前真相”，交易表负责“当时事实”，避免改价或改地址重写历史。
- 阈值集中在 `settings`，使成本、毛利、信用和漏称规则不会散落在 UI。
- 角色映射放在数据库侧，确保绕过页面调用 API 时仍执行最小权限。

## 6. 已知边界
- `fixed_pick_location_id` 未建立“一拣货位一 SKU”的唯一约束；数据库只强制拣货位有库存时单批号。
- 新用户默认角色为 `sales`，生产环境仍需管理员复核。
- `avg_weight_lb` 不是库存或发运实重，任何自动回填都属于违规实现。
