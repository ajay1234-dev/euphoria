"use client";

import { useState, useEffect, useRef } from "react";
import { onSnapshot } from "firebase/firestore";
import { votingStateRef } from "@/lib/firebase/paths";
import { syncServerTime, getServerOffset } from "@/lib/timeSync";
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
 * Synchronizes client clock with the server clock via NTP roundtrip sync,
 * guaranteeing accurate countdowns across all devices without document age drift.
 */
export function useVotingState(
  eventId: string | null | undefined
): UseVotingStateResult {
  const [votingState, setVotingState] = useState<VotingState | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(getServerOffset);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Perform NTP time synchronization
    syncServerTime().then((offset) => {
      setServerOffsetMs(offset);
    });
  }, []);

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
          const data = snap.data();
          setVotingState(data);
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
