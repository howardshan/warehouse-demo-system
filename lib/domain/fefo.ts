/**
 * 铁律 7:FEFO 在补货时控制,不在拣货时
 * 详见 /docs/decisions/0002-two-tier-locations.md
 */
export type BatchLite = {
  id: string;
  expiry_date: string | null;
  status: string;
  qty_units: number;
};

export function selectBatchForReplenishment(
  batches: BatchLite[],
): BatchLite | undefined {
  return [...batches]
    .filter((b) => b.status === "available" && b.qty_units > 0)
    .sort((a, b) => {
      const ae = a.expiry_date ?? "9999-12-31";
      const be = b.expiry_date ?? "9999-12-31";
      return ae.localeCompare(be);
    })[0];
}

export function canReplenish(
  pickFaceStock: { batch_id: string; qty_units: number }[],
  newBatchId: string,
): boolean {
  const existing = pickFaceStock.filter((s) => s.qty_units > 0);
  return (
    existing.length === 0 || existing.every((s) => s.batch_id === newBatchId)
  );
}
