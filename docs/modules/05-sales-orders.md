# 销售订单

## 1. 业务规则
- 建单时冻结客户名称、送货地址、账期和信用额度；建行时冻结称重属性、成交价和成本。
- 信用检查①发生在订单确认；结果及当时 exposure 写入 `credit_checks`，低毛利、低于成本和信用例外写入 `so_approvals`。
- 每次编辑后必须重跑信用、毛利、ATP 三道闸，只有 `confirmed` 订单可生成拣货单。
- 生成拣货单即设置 `locked_at` 并进入 `picking`；锁定后禁止增删行及修改商业字段。
- 仅在无有效拣货单且未发运时，显式撤销拣货单才能解锁。

## 2. 涉及的表视图
- 表：`sales_orders`、`so_lines`、`so_approvals`、`credit_checks`、`customers`、`products`、`batches`。
- 视图：`v_atp`、`v_max_cost_in_stock`、`v_credit_exposure`。

## 3. 对应的SQL文件
- `supabase/migrations/0012_sales_orders.sql`
- `supabase/migrations/0013_picking.sql`
- `supabase/migrations/0014_shipping.sql`
- `supabase/migrations/0017_phase_rls_extras.sql`

## 4. 守护了哪些铁律
- 铁律 1、2：价格与成本按订单行快照，不引用未来主档值。
- 铁律 4：仅 `confirmed` 状态可以进入拣货。
- 铁律 6：确认阶段执行信用检查①，放行阶段另有信用检查②。
- 铁律 8：生成拣货单即冻结订单。
- 铁律 9：改单必须重跑信用、毛利、ATP 三道闸。

## 5. 为什么这么设计
- 客户、地址、价格和成本都会变化，交易快照保证历史订单可重放、可对账。
- 冻结点放在拣货单生成，而不是开始拣货，避免纸单或手持任务与后台订单悄然分叉。
- 三类审批独立留痕，能区分业务风险来源和批准责任。

## 6. 已知边界
- 数据库函数强制“仅 confirmed 可拣”和锁单，但确认动作的三道闸编排仍由服务层负责。
- `v_credit_exposure` 计入开放订单与已签收未开票，可能与外部应收系统口径不同。
- 订单行仅限制已分配件数不超过订购件数；重量分配上限依赖库存与发运流程共同维护。
