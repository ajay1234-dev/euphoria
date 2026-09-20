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
        default: "bg-indigo-600 text-white shadow-2xs",
        secondary: "bg-purple-600 text-white shadow-2xs",
        outline: "border border-slate-200 text-slate-800 bg-white",
        destructive: "bg-red-600 text-white",
        warning: "bg-amber-100 text-amber-900 border border-amber-200",
        success: "bg-emerald-100 text-emerald-900 border border-emerald-200",
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
