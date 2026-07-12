import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
