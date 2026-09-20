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
          "text-white shadow-md bg-indigo-600 hover:bg-indigo-700",
          "bg-gradient-to-r from-[#3B4CCA] via-[#5244DE] to-[#7C3AED]",
          "hover:opacity-95 hover:shadow-lg",
        ].join(" "),
        secondary: [
          "bg-purple-600 hover:bg-purple-700 text-white shadow-sm",
          "hover:opacity-95",
        ].join(" "),
        outline: [
          "border border-slate-200 bg-white text-slate-800 shadow-2xs",
          "hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300",
        ].join(" "),
        ghost: [
          "bg-transparent text-slate-700",
          "hover:bg-slate-100 hover:text-slate-900",
        ].join(" "),
        destructive: [
          "bg-red-600 text-white shadow-sm",
          "hover:bg-red-700 hover:opacity-95",
        ].join(" "),
      },
      size: {
        sm: "h-9 px-4 text-xs rounded-[10px]",
        default: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
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
