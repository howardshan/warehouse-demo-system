# 表清单（Phases 1–9）

> 字段与约束以 `supabase/migrations/0001`–`0017` 为准；此处不复制 DDL。

| 表 | Migration | 为什么存在 |
|---|---|---|
| `user_profiles` | `0002_user_profiles.sql` | 将 Auth 用户映射为业务角色，供 RLS 与审批使用 |
| `suppliers` | `0003_locations_totes_suppliers.sql` | 保存采购上游主数据 |
| `locations` | `0003_locations_totes_suppliers.sql` | 区分拣货、储备、隔离、月台等储位 |
| `totes` | `0003_locations_totes_suppliers.sql` | 承载两步拣货的扫码周转筐 |
| `products` | `0004_products.sql` / `0022_product_sku_alphanumeric.sql` | SKU 为字母数字编码；`name` 为销售产品名称；双单位、当前价与固定拣货位 |
| `customers` | `0005_customers.sql` | 保存客户、信用额度、停供状态与 Permit |
| `customer_contacts` | `0005_customers.sql` | 支持订货、付款、收货等多联系人 |
| `customer_addresses` | `0005_customers.sql` | 支持多门店、账单与送货地址 |
| `credit_checks` | `0005_customers.sql` | 留存两次信用检查的当时事实 |
| `settings` | `0006_settings.sql` | 集中保存成本、毛利、信用、漏称等阈值 |
| `audit_log` | `0007_audit_log.sql` | 保存关键实体的增删改审计 |
| `price_history` | `0009_pricing_tables.sql` | 留存商品当前价每次变化 |
| `price_change_alerts` | `0009_pricing_tables.sql` | 承载非阻断采购成本上涨提醒 |
| `purchase_orders` | `0010_purchasing_receiving.sql` | 保存采购订单头与状态 |
| `po_lines` | `0010_purchasing_receiving.sql` | 保存订购件数、预计重量和成交成本 |
| `goods_receipts` | `0010_purchasing_receiving.sql` | 保存针对采购订单的收货单 |
| `gr_lines` | `0010_purchasing_receiving.sql` | 分列保存订购、供应商声称和盲收实收数据 |
| `batches` | `0011_batches_stock.sql` | 保存批号、成本、效期、状态与父批次 |
| `stock` | `0011_batches_stock.sql` | 保存储位批次级双单位库存与预留 |
| `replenishment_tasks` | `0011_batches_stock.sql` | 记录 FEFO 补货的来源、目标与批次 |
| `cycle_count_tasks` | `0011_batches_stock.sql` | 安排按储位/批次执行盘点 |
| `inventory_counts` | `0011_batches_stock.sql` | 保存期望、实盘双单位与差异原因 |
| `sales_orders` | `0012_sales_orders.sql` | 保存客户与地址等订单头快照及冻结状态 |
| `so_lines` | `0012_sales_orders.sql` | 保存成交价、成本、称重属性和分配快照 |
| `so_approvals` | `0012_sales_orders.sql` | 留存毛利、低于成本和信用审批 |
| `pick_lists` | `0013_picking.sql` | 管理两步拣货状态及订单冻结 |
| `pick_list_lines` | `0013_picking.sql` | 记录订单行、批次、储位、筐、实拣与实重 |
| `shipping_lists` | `0014_shipping.sql` | 管理放行、在途、签收与开票状态 |
| `sl_lines` | `0014_shipping.sql` | 保存发运批次、实发双单位和交易快照 |
| `delivery_trips` | `0015_returns.sql` | 将司机与配送/退货提货任务隔离 |
| `return_notes` | `0015_returns.sql` | 管理退货授权、提货、隔离收货和处置 |
| `return_lines` | `0015_returns.sql` | 保存原发运行、退货实重和新批次映射 |
| `delivery_adjustments` | `0015_returns.sql` | 留存短送、超送、重量修正等财务调整 |
| `repack_orders` | `0016_repack_traceability.sql` | 保存重包来源批次与双单位投入 |
| `repack_outputs` | `0016_repack_traceability.sql` | 保存重包产出及新批次映射 |
| `doc_counters` | `0017_phase_rls_extras.sql` | 并发安全地产生按日业务单号 |

`0001_enums.sql` 只创建枚举，`0008_rls.sql` 只补策略，均不新增业务表。
