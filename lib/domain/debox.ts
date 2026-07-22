/** 散卖去盒：毛重 → 净重（整箱卖不调用） */
export function netWeightAfterDebox(opts: {
  grossWeightLb: number;
  purchaseUnits: number;
  outerPackWeightLb: number | null | undefined;
  requiresDebox: boolean;
}): number {
  const gross = Number(opts.grossWeightLb);
  const units = Number(opts.purchaseUnits);
  if (!Number.isFinite(gross) || gross < 0) return 0;
  if (!opts.requiresDebox) return gross;
  const tare = Number(opts.outerPackWeightLb);
  if (!Number.isFinite(tare) || tare <= 0) return gross;
  const net = gross - units * tare;
  return net > 0 ? net : 0;
}
