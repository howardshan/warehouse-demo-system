"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/provider";

const STEPS = [
  {
    key: "blind",
    href: (id: string) => `/purchasing/receiving/${id}`,
    labelKey: "pg.receiving.stepBlind",
  },
  {
    key: "shipping",
    href: (id: string) => `/purchasing/receiving/${id}/delivery-note`,
    labelKey: "pg.receiving.stepShippingList",
  },
  {
    key: "invoice",
    href: (id: string) => `/purchasing/receiving/${id}/invoice`,
    labelKey: "pg.receiving.stepInvoice",
  },
  {
    key: "match",
    href: (id: string) => `/purchasing/receiving/${id}/match`,
    labelKey: "pg.receiving.stepMatch",
  },
] as const;

export function ReceivingWorkflowNav({
  receiptId,
  active,
  completed,
}: {
  receiptId: string;
  active: (typeof STEPS)[number]["key"];
  completed?: Partial<Record<(typeof STEPS)[number]["key"], boolean>>;
}) {
  const { t } = useI18n();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 text-sm">
      {STEPS.map((step) => {
        const isActive = step.key === active;
        const isDone = Boolean(completed?.[step.key]);
        return (
          <Link
            key={step.key}
            href={step.href(receiptId)}
            className={[
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5",
              isActive
                ? "bg-teal-800 font-medium text-white"
                : isDone
                  ? "border border-teal-200 bg-teal-50 font-medium text-teal-800 hover:bg-teal-100"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
            ].join(" ")}
          >
            {isDone && (
              <span
                aria-hidden
                className={
                  isActive
                    ? "text-xs text-white"
                    : "text-xs text-teal-700"
                }
              >
                ✓
              </span>
            )}
            {t(step.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
