# 迁移历史（Phases 1–9 完成 + 增量 `0018`–`0032`）

| Migration | Phase | 内容 |
|---|---|---|
| `0001_enums.sql` | 1 | 全系统状态、原因、角色枚举 |
| `0002_user_profiles.sql` | 1 | 用户角色、权限帮助函数、注册档案 |
| `0003_locations_totes_suppliers.sql` | 1 | 储位、周转筐、供应商 |
| `0004_products.sql` | 1 | 商品双单位、当前售价、固定拣货位 |
| `0005_customers.sql` | 1 | 客户、联系人、地址、信用检查与护栏 |
| `0006_settings.sql` | 1 | 成本、毛利、信用、漏称阈值 |
| `0007_audit_log.sql` | 1 | 通用审计及主数据审计 |
| `0008_rls.sql` | 1 | 主数据 RLS |
| `0009_pricing_tables.sql` | 2/4 | 价格历史与成本上涨提醒 |
| `0010_purchasing_receiving.sql` | 2 | 采购订单、盲收与三方核对 |
| `0011_batches_stock.sql` | 3 | 批次、双单位库存、补货、盘点、ATP |
| `0012_sales_orders.sql` | 4 | 销售订单快照、审批、冻结护栏 |
| `0013_picking.sql` | 5 | 两步拣货、差异原因、锁单与撤销 |
| `0014_shipping.sql` | 6 | 发运、信用②、签收收口、计费/信用视图 |
| `0015_returns.sql` | 7 | 配送趟次、退货隔离、新批次、调整 |
| `0016_repack_traceability.sql` | 8 | 重包投入产出、父链与追溯视图 |
| `0017_phase_rls_extras.sql` | 9 | 单号、跨表校验、防环、视图权限与索引 |
| `0018_add_it_account_roles.sql` | 增量 | 新增 IT / Account 角色枚举 |
| `0019_modules_permissions_it.sql` | 增量 | 模块化权限表（permissions / role_permissions / user_permissions），IT 管理用户与功能权限 |
| `0020_product_families_pack_variants.sql` | 增量 | 原产品（product_families）+ 多包装 SKU，同源追溯 |
| `0021_blind_receive_no_claimed_on_floor.sql` | 增量 | 盲收现场只录实收，供应商声称数量由送货单另录 |
| `0022_product_sku_alphanumeric.sql` | 增量 | SKU 强制字母数字编码 |
| `0023_gr_variance_at_match_only.sql` | 增量 | 差异原因移至三单核对页校验，draft 阶段放行 |
| `0024_inventory_adj_and_audit_coverage.sql` | 增量 | 库存调整（ADJ）表 + audit_log 触发器扩面 |
| `0025_complete_role_permissions.sql` | 增量 | 为全部角色补齐默认功能权限 |
| `0026_purchase_vs_sell_pack_ratio.sql` | 增量 | 采购单位与销售单位分离（pack_contains_qty） |
| `0027_family_outer_pack_tare.sql` | 增量 | 原产品外包装皮重；散卖去盒净重（requires_debox） |
| `0028_supplier_invoice_on_gr.sql` | 增量 | 收货独立录入送货单与发票两套声称数量 |
| `0029_family_supplier.sql` | 增量 | 原产品绑定供应商，避免混价 |
| `0030_family_code_globally_unique.sql` | 增量 | 原产品编码全局唯一 |
| `0031_family_catch_weight_receiving.sql` | 增量 | 称重收货：发票声称重量 + 差异阈值 |
| `0032_product_categories.sql` | 增量 | 商品分类主数据，挂到 product_families |

种子数据：`supabase/seed.sql`

## 如何跑

```bash
# 需要已登录 supabase CLI，并 link 到项目
npx supabase db push
# 或
npx supabase db reset   # 本地：migrations + seed
```

每个 migration 必须保留注释头（铁律关联、真实文档路径、回滚提示）。迁移必须按文件名前缀顺序执行；生产环境禁止修改已执行文件，应新增后续编号。
