# ADR-0008: 双单位 — ATP 按件数，计价按重量

## 状态
已采纳

## 背景
Catch weight 占比高；件数与重量语义不同。

## 决策
- ATP / 齐套 / 预留：件数
- 计价 / 开票：重量 lb（列名必须 `_lb`）
- **严禁**用 `avg_weight_lb` 填充实重

Phase 1：products 约束已落地。

## 后果
✅ 语义清晰；称重动作不可被系统「帮忙」废掉  
❌ 每个数量字段成对出现，UI/表更繁

## 被否决的方案
```sql
-- 这是反面案例,不要实现
update sl_lines set shipped_weight_lb = shipped_units * products.avg_weight_lb;
```
