"use client";

import { useEffect } from "react";
import { markOrderPrinted } from "@/app/actions/order-print";

export function PrintAndMark({
  orderId,
  kind,
}: {
  orderId: string;
  kind: "delivery" | "invoice";
}) {
  useEffect(() => {
    let done = false;
    (async () => {
      try {
        await markOrderPrinted(orderId, kind);
      } catch {
        /* 打印仍继续 */
      }
      if (!done) setTimeout(() => window.print(), 300);
    })();
    return () => {
      done = true;
    };
  }, [orderId, kind]);
  return null;
}
