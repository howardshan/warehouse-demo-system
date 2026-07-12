# 拣货

## 1. 业务规则
- 两步拣货先记录 `picked_units`，称重品再记录 `actual_weight_lb`；全部实重齐全后才能进入 `weighed`。
- 拣货行必须属于同一订单，批次商品必须匹配订单行、状态可用，来源储位必须确有该批次库存。
- 生成拣货单立即冻结销售订单；每张订单同时最多一个未取消拣货单。
- 实拣件数或重量与请求/预计不同必须选择 `variance_reason` 枚举。
- 撤销必须填写原因，且已发运或已取消的拣货单不能撤销。

## 2. 涉及的表视图
- 表：`pick_lists`、`pick_list_lines`、`sales_orders`、`so_lines`、`batches`、`stock`、`totes`。
- `pick_status` 和 `variance_reason` 枚举定义两步状态与差异分类。

## 3. 对应的SQL文件
- `supabase/migrations/0013_picking.sql`
- `supabase/migrations/0017_phase_rls_extras.sql`

## 4. 守护了哪些铁律
- 铁律 3：件数与实际 lb 重量分别采集，均重不能代替称重。
- 铁律 4：待审批、信用冻结及未称重状态不能越级发运。
- 铁律 7：拣货明确到批次和来源储位。
- 铁律 8：创建拣货单即锁单，撤销才可能解锁。
- 铁律 14：差异必须选择 `variance_reason`。

## 5. 为什么这么设计
- 拣件与称重分开，适配先集货到周转筐、再集中上秤的仓内流程。
- 行级记录批次、储位和周转筐，使库存扣减、召回和责任追踪都可复核。
- 冻结与撤销由数据库函数完成，防止 UI 与并发 API 请求绕过状态机。

## 6. 已知边界
- 迁移未自动按 `pending_weight_alert_hours` 生成漏称告警；看板需根据 `picked_at` 和状态计算超时。
- `variance_reason = stock_mismatch` 不会自动创建盘点任务，应用层需串联 `cycle_count_tasks`。
- 拣货迁移验证来源库存记录存在，但具体预留写入与 FEFO 选批由上游编排负责。
