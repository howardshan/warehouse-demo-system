/**
 * 铁律 5:信用占用必须含「已签收未开票」
 * 不做的话,本系统不开票 → exposure 永远是 0 → 信用控制静默失效
 * 详见 /docs/modules/10-customers-credit.md 第 5 节
 */
export type CreditExposureInput = {
  signedUninvoiced: number;
  invoicedUnpaid: number;
  confirmedUnshipped: number;
  includeUnshipped: boolean;
};

export function calcExposure(input: CreditExposureInput): number {
  return (
    input.signedUninvoiced +
    input.invoicedUnpaid +
    (input.includeUnshipped ? input.confirmedUnshipped : 0)
  );
}

export type CreditResult = "pass" | "warning" | "blocked";

export type CustomerCreditState = {
  creditLimit: number;
  creditStatus: string;
  overdueBlockDays: number;
};

/**
 * 铁律 6:信用要查两次(SO 确认 + 装车放行)——同一函数,不同 checkpoint
 * 不做第二道闸的话,货上车后才发现超限,已经收不回来
 * 详见 /docs/modules/10-customers-credit.md
 */
export function checkCredit(
  customer: CustomerCreditState,
  exposure: number,
  warningPct: number,
  checkpoint: "so_confirm" | "shipping_release",
): CreditResult {
  void checkpoint; // 同一函数两个检查点；日志侧区分
  if (
    customer.creditStatus === "full_block" ||
    customer.creditStatus === "hold_new_orders"
  ) {
    return "blocked";
  }
  if (customer.creditStatus === "cod_only" && customer.creditLimit <= 0) {
    // COD 客户仍允许下单,但金额占用按 0 limit 处理由调用方决定
  }
  if (exposure > customer.creditLimit) return "blocked";
  if (exposure > customer.creditLimit * (warningPct / 100)) return "warning";
  return "pass";
}

export function isOverdueBlocked(
  overdueBlockDays: number,
  oldestUnpaidDays: number,
): boolean {
  return oldestUnpaidDays > overdueBlockDays;
}
