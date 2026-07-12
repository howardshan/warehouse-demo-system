# 主数据

## 1. 业务规则
- 商品以唯一 SKU 管理温区、双单位、当前售价、质检方式与固定拣货位。
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
