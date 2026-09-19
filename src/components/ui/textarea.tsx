import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)]",
          "px-4 py-3 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-muted)]",
          "min-h-[96px] resize-y",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
