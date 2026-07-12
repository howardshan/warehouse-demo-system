# 术语表 Glossary

| 中文 | 英文 / 缩写 | 含义 |
|---|---|---|
| 销售订单 | SO / Sales Order | 客户叫货单；T+1 配送；建单锁价 |
| 采购订单 | PO / Purchase Order | 向供应商订货 |
| 收货单 | GR / GRN / Goods Receipt | 盲收实际点数结果 |
| 供应商送货单 | Supplier DN | 供应商声称发运数量（三单之一） |
| 可用库存 | ATP / Available to Promise | **按件数**；qty − allocated |
| 先进先出(效期) | FEFO | First Expired First Out；在**补货**时执行 |
| 称重品 | Catch weight | 按重量计价（$/lb），按件数订货/ATP |
| 均重 | avg_weight_lb | 仅预估金额；**禁止**填入实重 |
| 拣货位 | pick_face | 固定储位；一 SKU；同时一批号 |
| 存储位 | reserve | 动态；按批号分开 |
| 隔离区 | quarantine | 退货/质检暂存，不得直接回架 |
| 周转筐 | tote | 取货与称重之间的载体 |
| 拣货单 | Pick List | 生成即冻结 SO |
| 出货单 | Shipping List / SL | 实发+实重；签字后锁死 |
| 签收回单 | POD | Proof of Delivery；含影像 |
| 信用占用 | credit exposure | 已签收未开票 + … |
| 毛利护栏 | margin guard | 对比库存最高成本批 |
| 分装 | repack | 母批 → 子批；追溯映射 |
| 免税凭证 | Sales Permit | 必须有有效期 |
| 单位 | UOM | ordering_uom / pricing_uom |
| 磅 | lb | 全系统唯一重量单位 |
