import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestModeBannerProps {
  compact?: boolean;
  className?: string;
}

export function TestModeBanner({ compact = false, className }: TestModeBannerProps) {
  return (
    <div
      className={cn(
        "test-mode-banner flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
        className
      )}
      role="status"
      aria-label="Test mode active"
    >
      <AlertTriangle
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      {compact ? (
        <span>TEST MODE</span>
      ) : (
        <span>
          TEST MODE — nothing here counts toward the real results.
        </span>
      )}
    </div>
  );
}
