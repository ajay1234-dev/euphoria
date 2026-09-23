"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Robust countdown hook for live stage performance voting.
 * - Computes remaining time synchronously on initial render (NEVER defaults to 0 if endsAtMs > now).
 * - Incorporates serverOffsetMs (NTP clock synchronization).
 * - Updates on a 250ms interval with Math.ceil to guarantee crisp, flicker-free second ticks.
 */
export function useCountdown(endsAtMs: number | null, serverOffsetMs: number = 0): number {
  const computeRemaining = useCallback(() => {
    if (!endsAtMs) return 0;
    const serverNow = Date.now() + serverOffsetMs;
    return Math.max(0, Math.ceil((endsAtMs - serverNow) / 1000));
  }, [endsAtMs, serverOffsetMs]);

  const [remaining, setRemaining] = useState<number>(computeRemaining);

  useEffect(() => {
    setRemaining(computeRemaining());

    if (!endsAtMs) return;

    const tick = () => {
      setRemaining(computeRemaining());
    };

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAtMs, serverOffsetMs, computeRemaining]);

  return remaining;
}
