import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-50",
          size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
          variant === "primary" &&
            "bg-teal-800 text-white hover:bg-teal-900",
          variant === "secondary" &&
            "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
          variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
          variant === "ghost" && "text-stone-700 hover:bg-stone-100",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
