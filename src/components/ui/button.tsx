import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold",
    "text-sm transition-all duration-200 cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "text-[#1C1533] font-bold shadow-xs bg-[#F2960B] hover:bg-[#D48006]",
          "hover:shadow-sm active:bg-[#B96F04]",
        ].join(" "),
        secondary: [
          "bg-[#2C1B6B] hover:bg-[#201350] text-white shadow-xs",
          "hover:shadow-sm active:bg-[#160B3B]",
        ].join(" "),
        outline: [
          "border border-[#F0E4CE] bg-white text-[#1C1533] shadow-xs",
          "hover:bg-[#FBF1E0] hover:text-[#1C1533] hover:border-[#E2D2B8]",
        ].join(" "),
        ghost: [
          "bg-transparent text-[#1C1533]",
          "hover:bg-[#FBF1E0] hover:text-[#1C1533]",
        ].join(" "),
        destructive: [
          "bg-[#B3261E] text-white shadow-xs",
          "hover:bg-[#8F1D16] active:bg-[#721510]",
        ].join(" "),
      },
      size: {
        sm: "h-9 px-4 text-xs rounded-xl",
        default: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base font-bold",
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
