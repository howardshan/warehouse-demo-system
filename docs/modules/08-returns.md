# 退货

## 1. 业务规则
- 退货收货储位必须是 `quarantine`；进入 received/processed 时，为每行建立质量冻结的新隔离批次及库存。
- 可复上架退货不能恢复原批次，而是从隔离批次再生成可用子批次，并记录父链。
- 称重品退货收货必须填写 `returned_weight_lb`，退货价格与称重属性从原发运行快照继承。
- 司机只可更新提货时间、照片和签收人；仓库负责收货和处置，财务负责配送调整。
- 短送、超送、重量修正和破损进入 `delivery_adjustments`，已收货退货进入 credit note 队列。

## 2. 涉及的表视图
- 表：`delivery_trips`、`return_notes`、`return_lines`、`delivery_adjustments`、`batches`、`stock`。
- 视图：`v_credit_note_queue`、`v_batch_traceability`。

## 3. 对应的SQL文件
- `supabase/migrations/0015_returns.sql`
- `supabase/migrations/0016_repack_traceability.sql`
- `supabase/migrations/0017_phase_rls_extras.sql`

## 4. 守护了哪些铁律
- 铁律 3：称重品退货必须记录 lb 实重。
- 铁律 4：司机字段白名单、收货完整性和状态转换由数据库拦截。
- 铁律 9：配送差异作为调整事实留存，不直接篡改原发运。
- 铁律 11、12：退货先隔离、复上架换新批次，并保留父子追溯链。

## 5. 为什么这么设计
- 食品离开受控链路后不能直接并回原库存；双层新批次把“收到退货”和“质检后可售”明确分开。
- 司机 RLS 先限制可见趟次，触发器再限制可写字段，形成行级和列级双重防线。
- 调整表与原发运分离，确保签收事实不被财务修正覆盖。

## 6. 已知边界
- 当前默认 disposition 为 `pending`，没有自动报损函数；报损流程需应用层完成。
- 退货数量只对单行原发运数量做上限校验，跨多次退货的累计上限需额外汇总控制。
- `v_credit_note_queue` 提供待冲减金额，不生成正式贷项通知单。
