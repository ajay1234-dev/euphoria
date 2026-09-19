import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  description,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: "var(--ink)" }}
      >
        {label}
        {required && (
          <span
            aria-hidden="true"
            className="ml-1"
            style={{ color: "var(--error)" }}
          >
            *
          </span>
        )}
      </label>

      {/* Clone children with aria-describedby */}
      <div
        aria-describedby={[descId, errId].filter(Boolean).join(" ") || undefined}
      >
        {children}
      </div>

      {description && !error && (
        <p
          id={descId}
          className="text-xs"
          style={{ color: "var(--ink-muted)" }}
        >
          {description}
        </p>
      )}

      {error && (
        <p
          id={errId}
          className="text-xs font-medium"
          style={{ color: "var(--error)" }}
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
