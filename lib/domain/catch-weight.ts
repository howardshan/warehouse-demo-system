/**
 * 铁律 3:双单位 —— ATP 按件数,计价按重量(lb)
 * 严禁用 avg_weight_lb 自动填充实重。宁可报错。
 * 详见 /docs/modules/01-master-data.md / ADR-0008
 */

export function lineAmount(line: {
  isCatchWeight: boolean;
  units: number;
  weightLb: number | null;
  price: number;
}): number {
  if (line.isCatchWeight) {
    if (line.weightLb == null) {
      throw new Error("称重品缺少实重(lb),不能计算金额");
    }
    return line.weightLb * line.price;
  }
  return line.units * line.price;
}

/** 仅用于 SO 展示预估,不能用于开票 */
export function estimatedAmount(
  units: number,
  avgWeightLb: number,
  price: number,
): number {
  return units * avgWeightLb * price;
}
