# 客户与信用

## 1. 业务规则
- 客户维护信用额度、账期、逾期停供天数和信用状态；信用状态仅 finance/admin 可改。
- Sales Permit 的 URL 与有效期必须同时存在或同时为空。
- 信用检查执行两次：销售订单确认①、装车放行②；每次都把 exposure、额度、结果和越权人写入日志。
- 信用占用由开放订单与已签收未开票组成，不等待本系统并不存在的正式开票流程。

## 2. 涉及的表视图
- 表：`customers`、`customer_contacts`、`customer_addresses`、`credit_checks`、`sales_orders`、`shipping_lists`。
- 视图：`v_credit_exposure`。

## 3. 对应的SQL文件
- `supabase/migrations/0005_customers.sql`
- `supabase/migrations/0008_rls.sql`
- `supabase/migrations/0012_sales_orders.sql`
- `supabase/migrations/0014_shipping.sql`

## 4. 守护了哪些铁律
- 铁律 5：`v_credit_exposure` 明确计算开放订单与已签收未开票占用。
- 铁律 6：确认与放行两个检查点均写 `credit_checks`，信用状态另有 RLS 和触发器双保险。
- 铁律 9：订单编辑后信用必须与毛利、ATP 一起重跑。

## 5. 为什么这么设计
- 本系统不负责正式开票，若只看应收发票，信用占用会长期为零。
- 状态写权限与检查越权权限集中给财务/管理员，避免销售为完成出货自行解除停供。
- 检查日志保存“当时数据”，使事后能区分合理放行、预警放行和明确越权。

## 6. 已知边界
- `v_credit_exposure` 不含外部 ERP 的未收应收账款，生产集成时必须合并外部余额。
- 信用预警计算在发运迁移中固定使用 80%，尚未读取 `credit_warning_pct` 设置。
- 销售可见未分配销售代表的客户，这是建档过渡策略，严格租户隔离场景应收紧。
