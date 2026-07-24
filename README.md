# 食品配送管理系统（Warehouse Demo）

Next.js 15 + Supabase。业务价值在**护栏**，不在功能堆砌。

## 当前进度

**Phases 1–9 — 全部完成**

- 数据库迁移 `0001`–`0017`：主数据、采购盲收、批次库存、定价、销售订单、两步拣货、发运签收、退货、重包追溯与系统加固
- 增量迁移 `0018`–`0032`：IT 模块化权限、原产品（product families）多包装 SKU、盲收/三单核对强化、库存调整与审计扩面、称重收货、商品分类
- 关键护栏：双单位、价格/成本快照、两次信用检查、拣货冻结、签收锁定、释放预留、隔离新批次、批次父链防环
- 数据视图：ATP、最高在库成本、待开票、信用占用、贷项队列、批次追溯
- 完整文档：`/docs`（14 条铁律、十个模块、schema、ADR、runbook）

生产上线前仍需在目标 Supabase 环境执行迁移并完成按角色 UAT；“完成”指仓库内实现与文档范围已覆盖 Phases 1–9。

## 快速开始

```bash
cp .env.example .env.local   # 填入 Supabase 密钥
npm install
npx supabase db push         # 跑 migrations
npm run dev
```

阅读顺序：[`docs/README.md`](./docs/README.md) → **先读铁律**。

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建 |
| `npm test` | 领域纯函数单测 |
| `npm run docs:check` | 文档/迁移一致性检查 |

## 铁律提醒

如果你想「加个开关绕过约束」——停下来。见 `docs/00-invariants.md`。
