# ADR-0001: 成交价快照（为什么不能引用主档）

## 状态
已采纳

## 背景
售价是单一「当前价」字段，改价即覆盖。业务需要查历史订单的真实成交价。

## 问题
若订单行只存 `product_id`，读价时 join `products.current_price`，主档一改，历史全改。

## 决策
`so_lines.unit_price` / `cost_snapshot` 必须是物理列（Phase 4）。Phase 1 先保证主档改价可审计。

## 后果
✅ 历史发票金额稳定  
❌ 存储冗余；改价不会「自动同步」到未发货草稿以外的已锁价行

## 被否决的方案
```sql
-- 这是反面案例,不要实现
select p.current_price from so_lines l join products p on p.id = l.product_id;
```
