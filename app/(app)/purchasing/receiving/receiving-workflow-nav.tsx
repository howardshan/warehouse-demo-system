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
}: {
  receiptId: string;
  active: (typeof STEPS)[number]["key"];
}) {
  const { t } = useI18n();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-stone-200 pb-3 text-sm">
      {STEPS.map((step) => {
        const isActive = step.key === active;
        return (
          <Link
            key={step.key}
            href={step.href(receiptId)}
            className={
              isActive
                ? "rounded-md bg-teal-800 px-3 py-1.5 font-medium text-white"
                : "rounded-md px-3 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }
          >
            {t(step.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
