import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] font-semibold",
    "text-sm transition-all duration-200 cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "text-white shadow-md",
          "bg-[var(--gradient-hero)] bg-[length:200%_200%]",
          "hover:opacity-90 hover:shadow-lg",
        ].join(" "),
        secondary: [
          "bg-[var(--violet)] text-white shadow-sm",
          "hover:opacity-90",
        ].join(" "),
        outline: [
          "border border-[var(--border)] bg-transparent text-[var(--ink)]",
          "hover:bg-[var(--surface-alt)]",
        ].join(" "),
        ghost: [
          "bg-transparent text-[var(--ink)]",
          "hover:bg-[var(--surface-alt)]",
        ].join(" "),
        destructive: [
          "bg-[var(--error)] text-white shadow-sm",
          "hover:opacity-90",
        ].join(" "),
      },
      size: {
        sm: "h-9 px-4 text-xs rounded-[10px]",
        default: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
