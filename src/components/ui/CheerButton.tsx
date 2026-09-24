"use client";

import { useState, useCallback, useRef } from "react";
import { Heart } from "lucide-react";

interface FloatingHeart {
  id: number;
  driftX: number;
  size: number;
}

export function CheerButton({ disabled = false }: { disabled?: boolean }) {
  const [cheerCount, setCheerCount] = useState<number>(0);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const nextIdRef = useRef<number>(0);

  const handleCheer = useCallback(() => {
    if (disabled) return;
    setCheerCount((c) => c + 1);

    const heartId = nextIdRef.current++;
    const drift = (Math.random() - 0.5) * 48; // -24px to +24px
    const size = Math.floor(Math.random() * 8) + 20; // 20px - 28px

    setHearts((prev) => {
      // Cap at 20 concurrent floating hearts to preserve 60fps on mobile
      const trimmed = prev.length >= 20 ? prev.slice(prev.length - 19) : prev;
      return [...trimmed, { id: heartId, driftX: drift, size }];
    });

    // Auto-remove after animation completes (1.8s)
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1800);
  }, [disabled]);

  return (
    <div className="relative flex flex-col items-center gap-1.5 w-full">
      {/* Container for floating hearts positioned over the button */}
      <div className="relative w-full flex justify-center">
        {hearts.map((h) => (
          <span
            key={h.id}
            className="cheer-heart-float pointer-events-none select-none"
            style={
              {
                "--drift-x": `${h.driftX}px`,
                bottom: "100%",
              } as React.CSSProperties
            }
            aria-hidden="true"
          >
            <Heart
              className="fill-[#D6266E] text-[#D6266E] drop-shadow-xs"
              style={{ width: `${h.size}px`, height: `${h.size}px` }}
            />
          </span>
        ))}

        <button
          type="button"
          onClick={handleCheer}
          disabled={disabled}
          className="tap-scale inline-flex items-center justify-center gap-2 rounded-2xl border border-[#F9A8D4] bg-[#FCE7F0] px-5 py-2.5 text-sm font-bold text-[#D6266E] shadow-xs hover:bg-[#FBCFE8] active:scale-95 transition cursor-pointer select-none"
          aria-label="Cheer for this act"
        >
          <Heart className="h-4 w-4 fill-[#D6266E] text-[#D6266E] animate-pulse" />
          <span>Cheer for this Act</span>
          {cheerCount > 0 && (
            <span className="ml-1 rounded-full bg-[#D6266E] px-2 py-0.5 text-[11px] font-extrabold text-white tabular-nums">
              +{cheerCount}
            </span>
          )}
        </button>
      </div>

      {/* Explicit distinction requirement from Section 8 */}
      <p className="text-[11px] text-[#5B5470] font-medium text-center">
        Cheering is just for fun — it doesn&apos;t change the score.
      </p>
    </div>
  );
}
