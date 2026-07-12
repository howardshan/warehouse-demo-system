# RLS 总览（Phases 1–9）

> `0008_rls.sql` 建立主数据策略，`0010`–`0016` 随模块启用业务表策略，`0017_phase_rls_extras.sql` 补统一授权与 security-invoker 视图。

| 范围 | 可读 | 可写 | Migration |
|---|---|---|---|
| 用户与设置 | 认证用户可读档案；审计仅 admin/finance/manager | role 与 settings 由 admin 控制；审计无直写 | `0008_rls.sql` |
| 商品、供应商、储位、筐 | 认证业务用户可读 | purchasing 管商品/供应商，warehouse 管储位/筐，admin 兜底 | `0008_rls.sql` |
| 客户与信用 | 销售按代表范围读，管理/财务/仓库按职责读 | 客户更新限 admin/finance/manager；信用字段另由触发器限 finance/admin | `0008_rls.sql` |
| 采购与收货 | admin/purchasing/warehouse/finance 按职责读 | 采购由 purchasing，盲收行由 warehouse，收货头由 purchasing/warehouse | `0010_purchasing_receiving.sql` |
| 批次、库存、补货、盘点 | 常用库存可认证读；盘点含 finance | 库存、补货、盘点限 warehouse/admin；批次另允许 purchasing | `0011_batches_stock.sql` |
| 价格历史与提醒 | admin/purchasing/manager/finance | 提醒处理限 admin/purchasing/manager；历史由触发器写 | `0011_batches_stock.sql` |
| 销售订单 | 销售只看自己的单；管理、财务、仓库按职责可见 | 销售可维护自己的单，审批限 manager/finance/admin | `0012_sales_orders.sql` |
| 拣货 | 仓库及相关销售、财务、司机可读 | 仅 warehouse/admin 可写 | `0013_picking.sql` |
| 发运 | 司机仅看分配给自己的发运；业务角色按职责读 | 发运头限 warehouse/finance/admin，发运行限 warehouse/admin | `0014_shipping.sql` |
| 趟次与退货 | 司机只看自己的趟次及关联退货 | 司机仅通过策略进入自己的退货，触发器再限三字段；处置限仓库，调整限财务 | `0015_returns.sql` |
| 重包与追溯 | warehouse/purchasing/finance/admin 可读 | 仅 warehouse/admin 可写重包 | `0016_repack_traceability.sql` |
| 单号计数器 | 仅 admin 可直接读 | authenticated 不直接写，通过 security-definer 函数取号 | `0017_phase_rls_extras.sql` |

所有业务表均已启用 RLS。`0017` 对 authenticated 授予基础表权限并不绕过 RLS；六个业务视图使用调用者权限查询底表。关键列级铁律仍由触发器补强，例如销售即使获得客户行更新路径，也不能修改信用状态。
