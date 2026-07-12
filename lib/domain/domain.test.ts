import { describe, expect, it } from "vitest";
import { calcExposure, checkCredit } from "./credit";
import { lineAmount, estimatedAmount } from "./catch-weight";
import { calcAtp, releaseUnshippedAllocation } from "./atp";
import { calcMarginPct, isBelowCost, needsApproval } from "./margin";
import {
  canReplenish,
  selectBatchForReplenishment,
} from "./fefo";

describe("铁律 5 credit exposure", () => {
  it("含已签收未开票", () => {
    expect(
      calcExposure({
        signedUninvoiced: 1000,
        invoicedUnpaid: 0,
        confirmedUnshipped: 200,
        includeUnshipped: true,
      }),
    ).toBe(1200);
  });

  it("可配置不含未发货", () => {
    expect(
      calcExposure({
        signedUninvoiced: 1000,
        invoicedUnpaid: 0,
        confirmedUnshipped: 200,
        includeUnshipped: false,
      }),
    ).toBe(1000);
  });
});

describe("铁律 6 checkCredit", () => {
  it("超限 blocked", () => {
    expect(
      checkCredit(
        { creditLimit: 500, creditStatus: "ok", overdueBlockDays: 60 },
        600,
        80,
        "shipping_release",
      ),
    ).toBe("blocked");
  });

  it("full_block 一律拦截", () => {
    expect(
      checkCredit(
        { creditLimit: 99999, creditStatus: "full_block", overdueBlockDays: 60 },
        0,
        80,
        "so_confirm",
      ),
    ).toBe("blocked");
  });
});

describe("铁律 3 catch weight", () => {
  it("称重品按实重计价 T22", () => {
    expect(
      lineAmount({
        isCatchWeight: true,
        units: 1,
        weightLb: 12.4,
        price: 3.5,
      }),
    ).toBeCloseTo(43.4);
  });

  it("缺实重报错，不用均重", () => {
    expect(() =>
      lineAmount({
        isCatchWeight: true,
        units: 2,
        weightLb: null,
        price: 3.5,
      }),
    ).toThrow(/实重/);
  });

  it("预估金额单独函数", () => {
    expect(estimatedAmount(2, 40, 3.5)).toBe(280);
  });
});

describe("ATP", () => {
  it("按件数减预留", () => {
    expect(
      calcAtp([
        { batch_status: "available", qty_units: 10, allocated_units: 3 },
        { batch_status: "blocked", qty_units: 5, allocated_units: 0 },
      ]),
    ).toBe(7);
  });

  it("铁律 10 关单释放未发预留 T7", () => {
    expect(
      releaseUnshippedAllocation({
        orderedUnitsByLine: { a: 10 },
        shippedUnitsByLine: { a: 8 },
      }),
    ).toBe(2);
  });
});

describe("margin", () => {
  it("低于成本", () => {
    expect(isBelowCost(9, 10)).toBe(true);
  });
  it("需审批", () => {
    expect(needsApproval(calcMarginPct(100, 90), 15)).toBe(true);
  });
});

describe("铁律 7 FEFO", () => {
  it("选效期最早", () => {
    const b = selectBatchForReplenishment([
      { id: "b", expiry_date: "2026-08-01", status: "available", qty_units: 5 },
      { id: "a", expiry_date: "2026-07-01", status: "available", qty_units: 5 },
    ]);
    expect(b?.id).toBe("a");
  });

  it("拣货位有其他批则不可补", () => {
    expect(
      canReplenish([{ batch_id: "A", qty_units: 2 }], "B"),
    ).toBe(false);
    expect(canReplenish([{ batch_id: "A", qty_units: 2 }], "A")).toBe(true);
  });
});
