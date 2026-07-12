# 排障

## 登录后立即被踢回 /login

- 检查 `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` 是否与项目一致
- Auth → URL Configuration 是否包含本地 `http://localhost:3000`

## 能登录但主数据全空 / 报 RLS 错误

- 确认 migrations 已 push
- 确认 `user_profiles` 有行且 `is_active=true`
- sales 角色看不到未分配给自己的客户（见 RLS）

## 改客户信用状态报错「只有 finance/admin…」

- **预期行为**（铁律 5/6）。用 finance/admin 账号操作。
- 触发器：`trg_guard_credit_status`（`0005_customers.sql`）

## 创建称重品失败

- `pricing_uom` 必须是 `lb`
- `ordering_uom` ≠ `pricing_uom`
- 必须填 `avg_weight_lb`

## 文档/迁移不一致

```bash
npm run docs:check
```
