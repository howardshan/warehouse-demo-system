# Warehouse Demo System — 文档索引

> **文档是交付物的一部分。** SQL 唯一真相在 `/supabase/migrations/`。文档只回答「在哪个文件」和「为什么」，不复制 SQL。
>
> **当前状态：Phases 1–9 全部实现，迁移范围 `0001`–`0017`。**

## 阅读顺序（新人 / 另一个 AI）

1. [00-invariants.md](./00-invariants.md) — **先读铁律**，再写任何代码
2. [01-glossary.md](./01-glossary.md) — 术语
3. 对应业务的 [modules/](./modules/)
4. [schema/](./schema/) — 表 / 触发器 / RLS 清单
5. [decisions/](./decisions/) — 有争议的架构决策（ADR）
6. [runbook/](./runbook/) — 迁移、部署、排障

## Phase 状态

| Phase | 状态 | 模块文档 |
|---|---|---|
| 1 地基 | **完成** | [01-master-data](./modules/01-master-data.md), [10-customers-credit](./modules/10-customers-credit.md) |
| 2 采购入库 | **完成** | [02-purchasing-receiving](./modules/02-purchasing-receiving.md), [04-pricing](./modules/04-pricing.md) |
| 3 库存与两级储位 | **完成** | [03-inventory-locations](./modules/03-inventory-locations.md) |
| 4 销售订单 | **完成** | [05-sales-orders](./modules/05-sales-orders.md), [04-pricing](./modules/04-pricing.md) |
| 5 两步拣货 | **完成** | [06-picking](./modules/06-picking.md) |
| 6 出货签收 | **完成** | [07-shipping](./modules/07-shipping.md), [10-customers-credit](./modules/10-customers-credit.md) |
| 7 退货 | **完成** | [08-returns](./modules/08-returns.md) |
| 8 分装追溯 | **完成** | [09-repack-traceability](./modules/09-repack-traceability.md) |
| 9 看板与系统加固 | **完成** | [views](./schema/views.md), [triggers](./schema/triggers.md), [rls](./schema/rls.md) |

## Schema

- [erd.md](./schema/erd.md)
- [tables.md](./schema/tables.md)
- [views.md](./schema/views.md)
- [triggers.md](./schema/triggers.md) ⭐
- [rls.md](./schema/rls.md) ⭐

## ADR

| ADR | 主题 | 状态 |
|---|---|---|
| [0001](./decisions/0001-price-snapshot.md) | 成交价快照 | 已采纳并实现 |
| [0002](./decisions/0002-two-tier-locations.md) | 两级储位 + FEFO 在补货 | 已采纳并实现 |
| [0003](./decisions/0003-two-step-picking.md) | 两步拣货 | 已采纳并实现 |
| [0004](./decisions/0004-credit-includes-signed-uninvoiced.md) | 信用含已签收未开票 | 已采纳 |
| [0005](./decisions/0005-no-backorder-release-allocation.md) | 无欠单 + 关单释放预留 | 已采纳并实现 |
| [0006](./decisions/0006-cost-alert-nonblocking-margin-guard.md) | 成本提醒非阻断 | 已采纳 |
| [0007](./decisions/0007-returns-default-scrap.md) | 退货默认报损 | 已采纳；隔离/复上架已实现，自动报损仍属流程边界 |
| [0008](./decisions/0008-dual-uom-catch-weight.md) | 双单位 ATP/计价 | 已采纳 |
| [0009](./decisions/0009-so-freeze-on-picklist.md) | SO 冻结点=拣货单生成 | 已采纳并实现 |
| [0010](./decisions/0010-finance-data-without-invoicing.md) | 财务不做但数据必须存 | 已采纳 |

## Runbook

- [migrations.md](./runbook/migrations.md)
- [deployment.md](./runbook/deployment.md)
- [troubleshooting.md](./runbook/troubleshooting.md)
- [phase1-acceptance.md](./runbook/phase1-acceptance.md) ⭐ 历史文件名；当前为全系统状态与验收入口
