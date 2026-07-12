# 定价

## 1. 业务规则
- `products.current_price` 是当前报价，变价覆盖主档但自动写入 `price_history`。
- 新采购批次成本超过配置阈值时生成 `price_change_alerts`；提醒不阻塞入库。
- 新建订单行把当前售价写入 `so_lines.unit_price`，并把在库最高成本写入 `cost_snapshot`。
- 已存在订单行不会因主档改价或批次成本变化而改写；人工覆盖价格以 `price_overridden` 标识。

## 2. 涉及的表视图
- 表：`products`、`price_history`、`price_change_alerts`、`batches`、`so_lines`、`settings`。
- 视图：`v_max_cost_in_stock`。

## 3. 对应的SQL文件
- `supabase/migrations/0009_pricing_tables.sql`
- `supabase/migrations/0011_batches_stock.sql`
- `supabase/migrations/0012_sales_orders.sql`

## 4. 守护了哪些铁律
- 铁律 1：成交价与成本快照物理存储在订单行，历史不回读主档。
- 铁律 2：价格锁在每一行，允许同一订单包含不同时点或审批后的成交价。
- 铁律 4：低毛利和低于成本通过订单审批记录进入状态护栏。

## 5. 为什么这么设计
- 主档价回答“现在卖多少”，订单快照回答“当时成交多少”，两种事实不能共用一列。
- 最高在库成本是保守的毛利基准，避免用平均成本掩盖高成本批次风险。
- 成本提醒与毛利阻断分离：采购可以完成收货，销售确认仍须遵守审批闸门。

## 6. 已知边界
- `price_history.reason` 默认记录为 `product_update`，更细的人工改价原因需由应用流程补充。
- 成本提醒只比较同商品最近一个采购批次，不是移动平均或供应商发票成本。
- 迁移提供 `so_approvals` 结构，但完整的确认编排由应用层调用并重跑信用、毛利和 ATP。
