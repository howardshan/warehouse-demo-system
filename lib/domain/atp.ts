/**
 * 铁律 3:ATP 按件数算,不按重量
 * 详见 /docs/modules/03-inventory-locations.md
 */
export type StockRow = {
  batch_status: string;
  qty_units: number;
  allocated_units: number;
};

export function calcAtp(stock: StockRow[]): number {
  return stock
    .filter((s) => s.batch_status === "available")
    .reduce((sum, s) => sum + (s.qty_units - s.allocated_units), 0);
}

/**
 * 铁律 10:SO 关单时必须释放未发部分的预留
 * 不做的话,ATP 会被"幽灵预留"逐渐吃光,明明有货却显示无货
 * 详见 /docs/modules/07-shipping.md 第 5 节
 */
export function releaseUnshippedAllocation(args: {
  orderedUnitsByLine: Record<string, number>;
  shippedUnitsByLine: Record<string, number>;
}): number {
  let release = 0;
  for (const [lineId, ordered] of Object.entries(args.orderedUnitsByLine)) {
    const shipped = args.shippedUnitsByLine[lineId] ?? 0;
    release += Math.max(0, ordered - shipped);
  }
  return release;
}
