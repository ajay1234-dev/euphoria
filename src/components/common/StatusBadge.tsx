import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "error" | "info" | "default";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; border: string }> = {
  success: { bg: "var(--success-soft)", text: "var(--success)", border: "var(--success)" },
  warning: { bg: "var(--warning-soft)", text: "var(--warning)", border: "var(--warning)" },
  error: { bg: "var(--error-soft)", text: "var(--error)", border: "var(--error)" },
  info: { bg: "var(--primary-soft)", text: "var(--primary)", border: "var(--primary)" },
  default: { bg: "var(--surface-alt)", text: "var(--ink-muted)", border: "var(--border)" },
};

export function StatusBadge({ label, variant = "default", className }: StatusBadgeProps) {
  const styles = variantStyles[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
      }}
      aria-label={label}
    >
      {label}
    </span>
  );
}
