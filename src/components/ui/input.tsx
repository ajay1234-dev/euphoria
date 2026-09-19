import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)]",
          "px-4 py-3 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-muted)]",
          "h-12 min-h-[48px]",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
