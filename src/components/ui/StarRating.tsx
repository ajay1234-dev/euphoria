"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  disabled?: boolean;
  className?: string;
  size?: number;
}

const RATING_LABELS: Record<number, string> = {
  1: "20% · Fair Attempt",
  2: "40% · Good Effort",
  3: "60% · Solid Act",
  4: "80% · Outstanding Act",
  5: "100% · Exceptional Champion!",
};

export function StarRating({
  value,
  onChange,
  disabled = false,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const activeVal = hovered ?? value;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* 5-Star Row with min 56px touch targets */}
      <div
        className="flex items-center justify-center gap-2 sm:gap-3"
        role="radiogroup"
        aria-label="Rate this act from 1 to 5 stars"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeVal;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              disabled={disabled}
              onMouseEnter={() => !disabled && setHovered(star)}
              onMouseLeave={() => !disabled && setHovered(null)}
              onClick={() => !disabled && onChange?.(star)}
              className={cn(
                "group relative flex h-14 w-14 sm:h-16 sm:w-16 min-h-[56px] min-w-[56px] items-center justify-center rounded-2xl border transition-all duration-150 cursor-pointer select-none",
                "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#F2960B] focus-visible:ring-offset-2",
                "active:scale-90",
                disabled && "cursor-default opacity-85 active:scale-100",
                isFilled
                  ? "bg-[#FEF0D9] border-[#F2960B] shadow-xs text-[#F2960B]"
                  : "bg-white border-[#F0E4CE] text-[#D1C7B7] hover:border-[#F2960B]/60 hover:bg-[#FFFBF3]"
              )}
            >
              <Star
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-200",
                  isFilled
                    ? "fill-[#F2960B] text-[#F2960B] scale-110 drop-shadow-xs"
                    : "fill-transparent text-[#D1C7B7] group-hover:scale-105"
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {/* Dynamic Label Display */}
      <div className="h-6 flex items-center justify-center">
        {activeVal > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF0D9] border border-[#F2960B]/40 px-3 py-0.5 text-xs font-bold text-[#D48006]">
            <span>★</span>
            <span>{RATING_LABELS[activeVal]}</span>
          </span>
        ) : (
          <span className="text-xs font-medium text-[#5B5470]">
            Tap a star to choose your rating (1 to 5)
          </span>
        )}
      </div>
    </div>
  );
}
