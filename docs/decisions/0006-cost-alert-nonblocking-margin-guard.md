# ADR-0006: 成本上涨提醒非阻断 + 毛利护栏在 SO 端兜底

## 状态
已采纳

## 背景
入库成本突涨时，采购需要知道，但不能卡住收货（货已在码头）。

## 决策
涨幅超阈值 → `price_change_alerts`（非阻断）。  
若忽略改价，SO 端用最高库存成本做毛利护栏接住。

Phase 1：`settings.cost_alert_threshold_pct` / `margin_threshold_pct`。  
Phase 2：提醒队列；Phase 4：SO 毛利检查。

## 后果
✅ 收货不堵  
✅ 低毛利仍会被拦  
❌ 提醒可积压，依赖看板
