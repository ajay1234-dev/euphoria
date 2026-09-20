"use client";

import { useState, useEffect, useRef } from "react";
import { onSnapshot } from "firebase/firestore";
import { votingStateRef } from "@/lib/firebase/paths";
import type { VotingState } from "@/types/firestore";

interface UseVotingStateResult {
  votingState: VotingState | null;
  serverOffsetMs: number;
  loading: boolean;
  error: string | null;
}

/**
 * The real-time listener for stage voting state.
 * Subscribes to events/{eventId}/state/current via onSnapshot.
 * Calculates serverOffsetMs from server timestamps to prevent client clock tampering.
 */
export function useVotingState(
  eventId: string | null | undefined
): UseVotingStateResult {
  const [votingState, setVotingState] = useState<VotingState | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setVotingState(null);
      setServerOffsetMs(0);
      return;
    }

    setLoading(true);
    setError(null);

    const ref = votingStateRef(eventId);
    unsubRef.current = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setVotingState(data);
          if (data?.updatedAt) {
            setServerOffsetMs(data.updatedAt.toMillis() - Date.now());
          }
        } else {
          setVotingState(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubRef.current?.();
    };
  }, [eventId]);

  return { votingState, serverOffsetMs, loading, error };
}
