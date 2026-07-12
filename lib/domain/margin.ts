export function calcMarginPct(price: number, maxCostInStock: number): number {
  if (price <= 0) return 0;
  return ((price - maxCostInStock) / price) * 100;
}

export function needsApproval(
  marginPct: number,
  thresholdPct: number,
): boolean {
  return marginPct < thresholdPct;
}

export function isBelowCost(price: number, cost: number): boolean {
  return price < cost;
}
