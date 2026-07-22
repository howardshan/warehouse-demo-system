# 采购与收货

## 1. 业务规则
- 采购订单记录订购数量、预计重量与单位成本。
- **现场盲收**、**Shipping List（送货单）**、**Invoice（发票）** 必须在不同页面独立填写，录入时互不展示对方数量，也不展示 PO 订购数量。
- 盲收页只写实收件数、实重（称重品必填）、供应商批号和效期；Shipping List 页写 `supplier_document_no` + `supplier_claimed_units`；Invoice 页写 `supplier_invoice_no` + `invoice_claimed_units`（称重品另写 `invoice_claimed_weight_lb`）。
- **单据核对页**才同时展示订购 / Shipping List / Invoice / 实收；实收与两份供应商单据不一致须补 `variance_reason` 后再提交核对。称重品若 Invoice 重量 vs 实收重量偏差超过 `receiving_weight_tolerance_pct`，显示 warning（不阻断）。
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
- `supabase/migrations/0023_gr_variance_at_match_only.sql`
- `supabase/migrations/0028_supplier_invoice_on_gr.sql`


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
- 路由：`/purchasing/receiving/[id]` 盲收、`.../delivery-note` Shipping List、`.../invoice` Invoice、`.../match` 单据核对；查询字段刻意拆分，避免串视。
- 成本提醒失败只产生数据库 warning，不回滚批次创建。
