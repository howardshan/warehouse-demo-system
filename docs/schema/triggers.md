# 主要触发器清单

> 完整定义只在迁移文件中维护。

| 触发器 | 作用表 | 文件 | 守护的铁律 / 目的 |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | `0002_user_profiles.sql` | 自动建立业务角色档案 |
| `trg_guard_credit_status` | `customers` | `0005_customers.sql` | 铁律 5/6：仅 finance/admin 修改信用状态 |
| `trg_audit_products`、`trg_audit_customers` | 主数据 | `0007_audit_log.sql` | 铁律 1/5：关键主数据变更可追溯 |
| `trg_log_price_change` | `products` | `0009_pricing_tables.sql` | 铁律 1：当前价变化写价格历史 |
| `trg_validate_gr_line_po` | `gr_lines` | `0017_phase_rls_extras.sql` | 铁律 13：收货行不得串到其他采购订单 |
| `trg_pick_face_single_batch` | `stock` | `0011_batches_stock.sql` | 铁律 7：拣货位有货时只能一个批次 |
| `trg_alert_purchase_cost_increase` | `batches` | `0011_batches_stock.sql` | 成本涨幅超阈值生成非阻断提醒 |
| `trg_snapshot_sales_order_customer` | `sales_orders` | `0012_sales_orders.sql` | 铁律 1：冻结客户、地址、账期和额度 |
| `trg_snapshot_so_line` | `so_lines` | `0012_sales_orders.sql` | 铁律 1/2：冻结成交价、成本、称重属性 |
| `trg_guard_locked_sales_order` | `sales_orders` | `0012_sales_orders.sql` | 铁律 8：冻结后禁止修改商业字段 |
| `trg_guard_locked_so_line` | `so_lines` | `0012_sales_orders.sql` | 铁律 8：冻结后禁止增删改商业字段 |
| `trg_before_create_pick_list` | `pick_lists` | `0013_picking.sql` | 铁律 4：只有 confirmed 订单可拣 |
| `trg_lock_so_for_pick` | `pick_lists` | `0013_picking.sql` | 铁律 8：生成拣货单立即锁单 |
| `trg_validate_pick_line` | `pick_list_lines` | `0013_picking.sql` | 铁律 7：校验订单行、商品、批次和储位 |
| `trg_guard_pick_status` | `pick_lists` | `0013_picking.sql` | 铁律 3/4：实拣和称重未齐不得完成称重 |
| `trg_validate_shipping_header` | `shipping_lists` | `0017_phase_rls_extras.sql` | 校验拣货单、订单、客户一致 |
| `trg_snapshot_shipping_line` | `sl_lines` | `0014_shipping.sql` | 铁律 1/3：继承交易快照并校验实发 |
| `trg_lock_signed_sl_lines` | `sl_lines` | `0014_shipping.sql` | 铁律 4：签收明细不可改删 |
| `trg_guard_shipping_transition` | `shipping_lists` | `0014_shipping.sql` | 铁律 3/4/5/6：实重、状态、信用②护栏 |
| `trg_finalize_signed_shipping` | `shipping_lists` | `0014_shipping.sql` | 铁律 10：扣库存、释放预留、关闭订单 |
| `trg_snapshot_return_line` | `return_lines` | `0015_returns.sql` | 铁律 3/11：继承原发运并要求退货实重 |
| `trg_guard_return_note` | `return_notes` | `0015_returns.sql` | 铁律 4/11：隔离储位与司机字段白名单 |
| `trg_quarantine_received_return` | `return_notes` | `0015_returns.sql` | 铁律 11/12：收货生成隔离子批次 |
| `trg_complete_repack` | `repack_orders` | `0016_repack_traceability.sql` | 铁律 3/12：原子扣投入并生成产出子批次 |
| `trg_guard_batch_parent_cycle` | `batches` | `0017_phase_rls_extras.sql` | 铁律 12：父子批次链不可成环 |
| `trg_assign_po_number`、`trg_assign_gr_number`、`trg_assign_so_number` | 采购/收货/销售 | `0017_phase_rls_extras.sql` | 并发安全统一单号 |
| `trg_assign_pick_number`、`trg_assign_sl_number` | 拣货/发运 | `0017_phase_rls_extras.sql` | 并发安全统一单号 |
| `trg_assign_return_number`、`trg_assign_trip_number`、`trg_assign_repack_number` | 退货/趟次/重包 | `0017_phase_rls_extras.sql` | 并发安全统一单号 |
| `trg_audit_sales_orders`、`trg_audit_so_lines` | 销售订单 | `0012_sales_orders.sql` | 铁律 1/8：订单变化留痕 |
| `trg_audit_shipping_lists`、`trg_audit_sl_lines` | 发运 | `0014_shipping.sql` | 铁律 4：发运变化留痕 |
| `trg_audit_return_notes`、`trg_audit_return_lines` | 退货 | `0015_returns.sql` | 铁律 11/12：退货变化留痕 |

各迁移还为带 `updated_at` 的表配置统一时间戳触发器；它们属于基础一致性机制，未在上表逐项展开。
