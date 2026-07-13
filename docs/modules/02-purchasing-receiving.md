# 采购与收货

## 1. 业务规则
- 采购订单记录订购数量、预计重量与单位成本；收货员盲收时**只**填写实收件数、实重、供应商批号和效期，**不**填写供应商声称数量。
- `supplier_claimed_units` 由采购/文员按供应商送货单另行录入（与盲收界面分离）。
- `ordered_units`、`supplier_claimed_units`、`actual_units` 三个事实分列保存，形成订单、供应商单据、实收结果的三方核对，不能合并成一个数量。
- 送货单已录入后，实收与声称不一致时必须选择 `variance_reason`（`claimed=0` 表示送货单尚未录入，不强制差异原因）。
- 采购收货生成采购来源批次；新批成本超过阈值时写入非阻断成本提醒，不阻塞收货。

## 2. 涉及的表视图
- 表：`purchase_orders`、`po_lines`、`goods_receipts`、`gr_lines`、`batches`、`stock`、`price_change_alerts`。
- 视图：`v_max_cost_in_stock` 为订单成本快照提供当前在库最高成本。

## 3. 对应的SQL文件
- `supabase/migrations/0010_purchasing_receiving.sql`
- `supabase/migrations/0009_pricing_tables.sql`
- `supabase/migrations/0011_batches_stock.sql`
- `supabase/migrations/0017_phase_rls_extras.sql`
- `supabase/migrations/0021_blind_receive_no_claimed_on_floor.sql`

## 4. 守护了哪些铁律
- 铁律 2：价格和成本保留在交易行与批次层，不依赖单头推导。
- 铁律 3：实收同时保留件数和 `actual_weight_lb`。
- 铁律 11：采购批次必须关联收货行，供应商批号不可为空。
- 铁律 13：三类数量物理分列，支持真正盲收与三方核对。
- 铁律 14：收货差异必须记录枚举原因。

## 5. 为什么这么设计
- 将采购数量提前展示给收货员会诱导“照单填数”，独立实收数据才能暴露短收、错发和重量偏差。
- 成本上涨是定价信号而非入库失败；提醒采用非阻断队列，避免食品滞留收货月台。
- `0017` 再校验收货行确实属于该收货单的采购订单，防止跨单串行。

## 6. 已知边界
- 数据库保存盲收所需的独立事实；前端将「现场盲收」与「送货单声称」拆成两个区块，且不展示 PO 订购数量。
- 当前没有独立供应商发票表，三方核对中的供应商侧以 `supplier_claimed_units` 和单据号表示。
- 成本提醒失败只产生数据库 warning，不回滚批次创建。
