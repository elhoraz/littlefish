import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "amber";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-teal-700 hover:bg-teal-800 text-white shadow-2xs focus:ring-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-100 focus:ring-slate-400",
      outline:
        "border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800 focus:ring-teal-600",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs focus:ring-rose-500 dark:bg-rose-600 dark:hover:bg-rose-700",
      amber:
        "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs focus:ring-amber-500",
      ghost:
        "hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white focus:ring-slate-400",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 h-8 gap-1.5",
      md: "text-xs sm:text-sm px-3.5 py-2 h-9 sm:h-10 gap-2",
      lg: "text-sm sm:text-base px-5 py-2.5 h-11 gap-2.5",
      icon: "h-8 w-8 sm:h-9 sm:w-9 p-1.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
