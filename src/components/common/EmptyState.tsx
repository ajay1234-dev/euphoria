import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl py-12 px-6 text-center",
        className
      )}
      style={{ background: "var(--surface-alt)" }}
    >
      {icon && (
        <div
          className="text-4xl opacity-40"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <p className="font-semibold" style={{ color: "var(--ink)" }}>
        {title}
      </p>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: "var(--ink-muted)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
