# 库存与两级储位

## 1. 业务规则
- 库存以“储位 + 批次”唯一记录，同时保存件数、重量、已分配件数和已分配重量。
- **查看库存**（`/inventory/stock`）只读展示在手/占用/ATP；**库存调整 ADJ**（`/inventory/adj`）改数必须选 `variance_reason`，并写入 `inventory_adjustments`。
- 实际实现使用 `stock.qty_weight_lb`，不是原计划中未带单位后缀的 `qty_weight`；这是为落实“重量字段必须显式 `_lb`”所做的有意偏差。
- `pick_face` 有正库存时只能容纳一个批次，并用事务级 advisory lock 防止并发混批。
- 补货任务显式记录来源、目标、批次与双单位数量；FEFO 候选应按可用批次效期最早选择。
- ATP 仅汇总可用批次、活跃非隔离储位，并扣除已分配数量。
- 创建/修改/删除由 `audit_log` 触发器留痕；专用查看页为 `/it/audit-log`。

## 2. 涉及的表视图
- 表：`locations`、`batches`、`stock`、`replenishment_tasks`、`cycle_count_tasks`、`inventory_counts`、`inventory_adjustments`、`audit_log`。
- 视图：`v_atp`、`v_max_cost_in_stock`。

## 3. 对应的SQL文件
- `supabase/migrations/0011_batches_stock.sql`
- `supabase/migrations/0017_phase_rls_extras.sql`
- `supabase/migrations/0024_inventory_adj_and_audit_coverage.sql`

## 4. 守护了哪些铁律
- 铁律 3：库存和分配均使用件数与 lb 重量双单位。
- 铁律 7：拣货位单批号触发器阻止混批，补货任务保留批次和效期语义。
- 铁律 10：ATP 扣除预留，签收收口时由发运流程释放未发预留。
- 铁律 14：盘点差异使用 `variance_reason`，差异不能无原因落账。

## 5. 为什么这么设计
- 储备位允许多批，拣货位限制单批，把 FEFO 决策集中到补货环节，降低拣货现场选批复杂度。
- 件数用于履约，重量用于称重品计价；两者不能通过均重互相伪造。
- ATP 作为统一视图，避免订单、拣货和看板各自计算出不同的可用量。

## 6. 已知边界
- 数据库没有自动按效期创建补货任务；调用方必须以 `expiry_date` 升序选择 FEFO 来源批次。
- ATP 按商品汇总，不提供逐储位、逐批次承诺明细。
- `greatest(..., 0)` 用于签收收口防止负数，但异常差额仍应通过盘点任务调查。
