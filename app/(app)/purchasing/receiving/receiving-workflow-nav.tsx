import Link from "next/link";

const STEPS = [
  { key: "blind", href: (id: string) => `/purchasing/receiving/${id}`, label: "现场盲收" },
  {
    key: "shipping",
    href: (id: string) => `/purchasing/receiving/${id}/delivery-note`,
    label: "Shipping List",
  },
  {
    key: "invoice",
    href: (id: string) => `/purchasing/receiving/${id}/invoice`,
    label: "Invoice",
  },
  {
    key: "match",
    href: (id: string) => `/purchasing/receiving/${id}/match`,
    label: "单据核对",
  },
] as const;

export function ReceivingWorkflowNav({
  receiptId,
  active,
}: {
  receiptId: string;
  active: (typeof STEPS)[number]["key"];
}) {
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
            {step.label}
          </Link>
        );
      })}
    </nav>
  );
}
