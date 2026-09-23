"use client";

import { useState, useEffect, useRef } from "react";

interface AnimatedScoreProps {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedScore({ value, duration = 1400, className = "" }: AnimatedScoreProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (value <= 0) {
      setDisplayValue(0);
      return;
    }

    const startVal = 0;
    const endVal = value;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Quartic ease-out curve for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = startVal + (endVal - startVal) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{displayValue.toFixed(1)}%</span>;
}
