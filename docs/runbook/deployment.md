# 部署

## 1. Supabase

1. 创建项目，取得 URL / anon / service_role
2. 配置 `.env`（勿提交）
3. `npx supabase link --project-ref <ref>`
4. `npx supabase db push`
5. （可选）跑 `seed.sql`
6. 创建私有 Storage buckets：`pod-images`、`sales-permits`

## 2. 首个管理员

1. Dashboard → Authentication 创建用户
2. 将 `user_profiles.role` 设为 `admin`（触发器可能已用默认 `sales` 建档）

```sql
update user_profiles set role = 'admin' where id = '<auth-user-uuid>';
```

## 3. Vercel

1. Import GitHub 仓库
2. 环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（仅服务端）
3. 部署

**禁止**把 `SUPABASE_SERVICE_ROLE_KEY` 放进客户端 bundle。
