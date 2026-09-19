import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  [
    "relative w-full rounded-[14px] border p-4",
    "[&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px]",
    "[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-[var(--ink)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)]",
        destructive: [
          "bg-[var(--error-soft)] border-[var(--error)]",
          "text-[var(--ink)] [&>svg]:text-[var(--error)]",
        ].join(" "),
        warning: [
          "bg-[var(--warning-soft)] border-[var(--warning)]",
          "text-[var(--ink)] [&>svg]:text-[var(--warning)]",
        ].join(" "),
        success: [
          "bg-[var(--success-soft)] border-[var(--success)]",
          "text-[var(--ink)] [&>svg]:text-[var(--success)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-snug tracking-tight text-sm", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-[var(--ink-muted)] [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
