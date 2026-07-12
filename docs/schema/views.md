# 视图清单（Phases 1–9）

| 视图 | Migration | 用途 | 守护铁律 |
|---|---|---|---|
| `v_atp` | `0011_batches_stock.sql` | 按商品汇总在手、预留和可承诺的件数/重量；排除隔离与不可用批次 | 3、7、10 |
| `v_max_cost_in_stock` | `0011_batches_stock.sql` | 取得商品当前可用在库批次最高成本，作为保守毛利快照基准 | 1 |
| `v_billing_queue` | `0014_shipping.sql` | 汇总已签收、待开票且实重完整的发运金额 | 3、4、5 |
| `v_credit_exposure` | `0014_shipping.sql` | 汇总开放订单和已签收未开票占用及剩余额度 | 5、6 |
| `v_credit_note_queue` | `0014_shipping.sql` 建占位、`0015_returns.sql` 落地 | 汇总已收货/已处理退货的待冲减金额与原因 | 11 |
| `v_batch_traceability` | `0016_repack_traceability.sql` | 递归展开每个批次到所有祖先批次的路径 | 11、12 |

`0017_phase_rls_extras.sql` 将六个视图设为 `security_invoker` 并授予 authenticated 只读权限，使查询继续遵守底表 RLS。`v_batch_traceability` 本身不直接输出客户；下游召回名单需关联 `sl_lines` 与 `shipping_lists`。
