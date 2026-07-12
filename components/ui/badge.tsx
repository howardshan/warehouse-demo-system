import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-stone-100 text-stone-700",
        tone === "ok" && "bg-teal-50 text-teal-800",
        tone === "warn" && "bg-amber-50 text-amber-800",
        tone === "danger" && "bg-red-50 text-red-800",
        className,
      )}
      {...props}
    />
  );
}
