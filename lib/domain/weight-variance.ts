/** 重量偏差百分比；基准为 0 时无法计算返回 null */
export function weightVariancePct(
  actualLb: number,
  claimedLb: number,
): number | null {
  const actual = Number(actualLb);
  const claimed = Number(claimedLb);
  if (![actual, claimed].every((n) => Number.isFinite(n))) return null;
  if (claimed <= 0) return null;
  return (Math.abs(actual - claimed) / claimed) * 100;
}

export function isWeightVarianceOverThreshold(
  actualLb: number,
  claimedLb: number,
  thresholdPct: number,
): boolean {
  const pct = weightVariancePct(actualLb, claimedLb);
  if (pct == null) return false;
  const threshold = Number(thresholdPct);
  if (!Number.isFinite(threshold) || threshold < 0) return false;
  return pct > threshold;
}
