import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-full px-2.5 py-0.5",
    "text-xs font-semibold transition-colors",
    "focus:outline-none focus:ring-[3px] focus:ring-[var(--primary)] focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-white",
        secondary: "bg-[var(--violet)] text-white",
        outline: "border border-[var(--border)] text-[var(--ink)] bg-transparent",
        destructive: "bg-[var(--error)] text-white",
        warning: "bg-[var(--warning-soft)] text-[var(--ink)]",
        success: "bg-[var(--success-soft)] text-[var(--ink)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
