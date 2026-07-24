# ADR 0011：业务表 RLS 从「角色」统一为「权限点」

- 状态：已采纳（2026-07-23），由迁移 `0033_permission_based_rls.sql` 实现
- 相关：[0019 权限表与判定函数]、[ADR 0004/0005/0009 等既有护栏保持不变]

## 背景

系统原为**双轨权限**：
- 应用层（侧栏 / 页面守卫 / 按钮）已按 **权限点**（`permissions` 表，`user_has_permission`）判定；
- 但业务表 **RLS** 有 73 条策略用 **角色**（`has_role(app_role[])`）判定，仅 3 条用权限点。

后果：在 `/it/permissions` 前端给用户勾选/收回某个权限点，只改变菜单可见性，**不影响数据库能否读写**；且 `admin` 账号在应用层短路全部权限（`lib/auth/access.ts:24`）。测试一个"只能拣货、不能改价"的场景，必须真的创建对应角色的账号。

## 决策

把业务表 RLS 从「角色」统一改为「权限点」：把每条策略里的 `has_role(array[...])` 换成 `public.user_has_permission('<对应权限点>')`。

- **角色降级为「权限模板」**：`role_permissions` 保留每个角色的默认权限集合；建号选角色 = 一键填充这套默认。之后可在 `/it/permissions` 对单个用户逐点 grant/deny 覆盖。
- `user_has_permission` 已内置三层逻辑（`0019:142-183`）：admin 恒真 → 用户级覆盖 → 角色默认。故 admin 仍全通，普通用户按"角色默认 ± 个人覆盖"生效。

### 价值
1. **测试/开发**：单个非-admin 账号在前端勾选即可端到端验证任意功能组合，不必维护 9 类角色账号。
2. **产品卖点**：对 Southern Star（45 人小分销商、一人多岗）而言，"精确到功能授权"优于僵硬的固定角色，是相对其 20 年旧系统的差异化点。

## 保留的护栏（重要）

14 条策略在 `has_role` 之外还有**行级归属 / 状态**逻辑，改造时**原样保留，只替换 has_role 段**：

- 行级归属：`sales_rep_id = auth.uid()`（销售看自己的单）、`driver_id = auth.uid()`（司机看自己的趟次）、`default_sales_rep = auth.uid()`（销售看自己的客户）、`requested_by = auth.uid()`、`user_id = auth.uid()`、`id = auth.uid()`；子表经 `EXISTS(父表 …)` 继承归属。
- 状态护栏：`sales_orders` 仅 `status='draft'` 可删。
- 安全护栏：`user_profiles` 更新时，非 IT 用户**不能改自己的 role**（CHECK 保留）。

示例（`sales_orders_delete`）：
```sql
create policy sales_orders_delete on sales_orders for delete to authenticated
  using (status = 'draft'::so_status
         and (sales_rep_id = auth.uid()
              or public.user_has_permission('sales.orders.write')));
```

信用状态列级护栏（仅 finance/admin 可改 `customers.credit_status`）由**触发器** `fn_guard_credit_status_write`（`0005`）保证，不在本次 RLS 改造范围内，继续生效。

## 权限点设计

- 复用现有 29 个权限点；新增 10 个"读"权限点，使读与写可独立开关：`purchasing.receiving.read`、`purchasing.pricing.read`、`warehouse.picklists.read`、`warehouse.shipping.read`、`warehouse.returns.read`、`warehouse.trips.read`、`warehouse.repack.read`、`warehouse.inventory.read`、`finance.adjustments.read`、`sales.approvals.read`。
- 每条旧策略的角色集合 → 授予对应权限点写入 `role_permissions`，**旧行为逐一保留**（选某角色 = 改造前该角色的权限）。

## 有意的简化（demo 范围）

- **主数据与库存的 SELECT 保持开放**（`products / suppliers / locations / stock / batches / settings / product_families / product_categories` 等 16 条 `using(true)` 读策略不变）：产品目录、库存对全体登录用户可见。细粒度控制作用于"写"以及订单/信用/收货/拣货/发运/退货/审批/审计等敏感或带归属的读。
- `sales_orders` 的 INSERT 不再强制 `sales_rep_id = auth.uid()`（原限制普通销售只能建自己名下的单）；改为仅校验 `sales.orders.write`。管理者本就可为他人建单，权限模型下不再区分，简化且不影响演示。
- `credit_checks` 的 INSERT 由 `account.credit.read` 把关（该表是信用检查流水，由 SO 确认/发运放行流程写入）。

## 回滚

开发期直接 `supabase db reset`（本地）或重跑至 0032 快照即可。生产回滚需重建 0033 之前的 `has_role` 版策略（各策略定义见 git 中 0008/0010–0025 及本 ADR 前的策略快照 `backup-remote-data`）。

## 后续

- 应用层 `lib/auth/access.ts` 的 admin 短路保持不变（admin 恒全通）。
- 侧栏 `nav.ts` 新增的 10 个读权限点如需在菜单体现可后续补；本次仅用于 RLS 与 `/it/permissions` 勾选。
- UAT：用一个非-admin 账号在 `/it/permissions` 勾选单个权限点，验证对应功能端到端可用/被拦。
