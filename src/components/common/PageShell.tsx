import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  centered?: boolean;
}

const maxWidths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full",
};

export function PageShell({
  children,
  className,
  maxWidth = "md",
  centered = true,
}: PageShellProps) {
  return (
    <main
      id="main-content"
      className={cn(
        "min-h-dvh px-4 py-8",
        centered && "flex flex-col items-center justify-center",
        className
      )}
      tabIndex={-1}
    >
      <div className={cn("w-full", maxWidths[maxWidth])}>{children}</div>
    </main>
  );
}
