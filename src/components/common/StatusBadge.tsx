import { cn } from "@/lib/utils";

export type StatusVariant =
  | "live"
  | "scheduled"
  | "completed"
  | "skipped"
  | "verified"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "default";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
  pulse?: boolean;
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; border: string }> = {
  live: { bg: "#FCE7F0", text: "#D6266E", border: "#F9A8D4" },
  scheduled: { bg: "#F1E8FF", text: "#2C1B6B", border: "#DDD6FE" },
  completed: { bg: "#DFF3E6", text: "#146C43", border: "#BBF7D0" },
  skipped: { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
  verified: { bg: "#DFF3E6", text: "#146C43", border: "#BBF7D0" },
  success: { bg: "var(--color-success-soft)", text: "var(--color-success)", border: "var(--color-success)" },
  warning: { bg: "var(--color-warning-soft)", text: "var(--color-warning)", border: "var(--color-warning)" },
  error: { bg: "var(--color-error-soft)", text: "var(--color-error)", border: "var(--color-error)" },
  info: { bg: "var(--color-primary-soft)", text: "var(--color-primary-strong)", border: "var(--color-primary)" },
  default: { bg: "var(--color-surface-muted)", text: "var(--color-ink-muted)", border: "var(--color-border)" },
};

export function StatusBadge({ label, variant = "default", className, pulse }: StatusBadgeProps) {
  const isLive = variant === "live" || pulse;
  const isVerified = variant === "verified";
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        className
      )}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
      }}
      aria-label={label}
    >
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D6266E] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D6266E]" />
        </span>
      )}
      {isVerified && (
        <span className="text-xs font-bold leading-none" aria-hidden="true">✓</span>
      )}
      <span>{label}</span>
    </span>
  );
}
