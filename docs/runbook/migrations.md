# 迁移历史（Phases 1–9 完成）

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

种子数据：`supabase/seed.sql`

## 如何跑

```bash
# 需要已登录 supabase CLI，并 link 到项目
npx supabase db push
# 或
npx supabase db reset   # 本地：migrations + seed
```

每个 migration 必须保留注释头（铁律关联、真实文档路径、回滚提示）。迁移必须按文件名前缀顺序执行；生产环境禁止修改已执行文件，应新增后续编号。
