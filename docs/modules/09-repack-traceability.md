# 分装与批次追溯

## 1. 业务规则
- 重包工单记录来源批次、来源储位以及双单位投入；完成前必须至少有一个产出行。
- 每个产出行生成新的 `repack` 批次并写入 `parent_batch_id`，再把双单位库存放入目标储位。
- 投入不得超过来源储位未分配库存；完成后扣减来源，耗尽时将父批次标记为 depleted。
- 批次父链不得自指或形成环；祖先链可由函数和 `v_batch_traceability` 查询。

## 2. 涉及的表视图
- 表：`repack_orders`、`repack_outputs`、`batches`、`stock`、`locations`。
- 视图：`v_batch_traceability`。
- 函数：`batch_parent_chain`。

## 3. 对应的SQL文件
- `supabase/migrations/0016_repack_traceability.sql`
- `supabase/migrations/0017_phase_rls_extras.sql`

## 4. 守护了哪些铁律
- 铁律 2：产出成本物理保存在新批次和重包产出行。
- 铁律 3：投入、产出和库存均保留件数与 lb 重量。
- 铁律 11、12：重包产出建立父子批次，父链防环且可递归查询。

## 5. 为什么这么设计
- 重包改变包装形态但不能切断来源；新批次保留独立库存身份，同时指向投入批次。
- 递归视图预展开任意批次到所有祖先，支持召回、审计和跨多次重包查询。
- 完成动作在一个数据库触发器中创建产出并扣减投入，避免只完成一半。

## 6. 已知边界
- `v_batch_traceability` 当前回答祖先链，不直接连接发运客户；按批号查下游客户需再关联 `sl_lines` 与 `shipping_lists`。
- 数据库不强制产出总重量等于投入重量，损耗率与质量平衡需业务层审核。
- `repack_outputs.unit_cost` 由流程提供，当前未自动按投入成本和产出比例分摊。
