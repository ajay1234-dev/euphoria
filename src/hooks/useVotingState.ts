"use client";

import { useState, useEffect, useRef } from "react";
import { onSnapshot } from "firebase/firestore";
import { votingStateRef } from "@/lib/firebase/paths";
import type { VotingState } from "@/types/firestore";

interface UseVotingStateResult {
  votingState: VotingState | null;
  loading: boolean;
  error: string | null;
}

/**
 * The one real-time listener in Phase 1.
 * Subscribes to events/{eventId}/state/current via onSnapshot.
 */
export function useVotingState(
  eventId: string | null | undefined
): UseVotingStateResult {
  const [votingState, setVotingState] = useState<VotingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setVotingState(null);
      return;
    }

    setLoading(true);
    setError(null);

    const ref = votingStateRef(eventId);
    unsubRef.current = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setVotingState(snap.data());
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

  return { votingState, loading, error };
}
