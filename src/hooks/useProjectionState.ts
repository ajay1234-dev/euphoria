"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { onSnapshot, Timestamp } from "firebase/firestore";
import { projectionStateRef } from "@/lib/firebase/paths";
import {
  sendProjectionCommand,
  setProjectionSet,
  updateProjectionProgress,
  setProjectionTestMode,
} from "@/lib/admin/projection";
import type {
  ProjectionCommand,
  ProjectionStage,
  ProjectionState,
} from "@/types/firestore";
import type { ProjectionSetId } from "@/config/projection";

const DEFAULT_STATE: ProjectionState = {
  command: "IDLE",
  selectedSet: "set1",
  currentStage: "Idle",
  currentDepartment: null,
  currentRank: null,
  currentIndex: 0,
  revealSequenceId: "initial",
  isTestMode: false,
  updatedAt: Timestamp.now(),
};

export function useProjectionState(eventId: string | null) {
  const [state, setState] = useState<ProjectionState>(DEFAULT_STATE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = projectionStateRef(eventId);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setState({
            command: data.command ?? "IDLE",
            selectedSet: data.selectedSet ?? "set1",
            currentStage: data.currentStage ?? "Idle",
            currentDepartment: data.currentDepartment ?? null,
            currentRank: data.currentRank ?? null,
            currentIndex: data.currentIndex ?? 0,
            revealSequenceId: data.revealSequenceId ?? "live",
            isTestMode: data.isTestMode ?? false,
            updatedAt: data.updatedAt ?? Timestamp.now(),
          });
        } else {
          setState(DEFAULT_STATE);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn("useProjectionState error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  const sendCommand = useCallback(
    async (command: ProjectionCommand, extra?: Partial<ProjectionState>) => {
      if (!eventId) return;
      // Optimistic update for zero latency
      setState((prev) => ({
        ...prev,
        command,
        ...(command === "START" || command === "REPLAY"
          ? {
              revealSequenceId: `${Date.now()}`,
              currentStage: "Idle",
              currentDepartment: null,
              currentRank: null,
              currentIndex: 0,
            }
          : command === "RESET"
          ? {
              currentStage: "Idle",
              currentDepartment: null,
              currentRank: null,
              currentIndex: 0,
            }
          : command === "SKIP_TO_FINAL"
          ? { currentStage: "Final Results" }
          : {}),
        ...extra,
      }));

      await sendProjectionCommand(eventId, command, extra);
    },
    [eventId]
  );

  const changeSet = useCallback(
    async (setId: ProjectionSetId) => {
      if (!eventId) return;
      setState((prev) => ({ ...prev, selectedSet: setId }));
      await setProjectionSet(eventId, setId);
    },
    [eventId]
  );

  const reportProgress = useCallback(
    async (
      stage: ProjectionStage,
      department?: string | null,
      rank?: number | null,
      index?: number
    ) => {
      if (!eventId) return;
      setState((prev) => ({
        ...prev,
        currentStage: stage,
        currentDepartment: department ?? null,
        currentRank: rank ?? null,
        currentIndex: typeof index === "number" ? index : prev.currentIndex,
      }));
      await updateProjectionProgress(eventId, stage, department, rank, index);
    },
    [eventId]
  );

  const toggleTestMode = useCallback(
    async (val: boolean) => {
      if (!eventId) return;
      setState((prev) => ({ ...prev, isTestMode: val }));
      await setProjectionTestMode(eventId, val);
    },
    [eventId]
  );

  return {
    state,
    loading,
    error,
    sendCommand,
    changeSet,
    reportProgress,
    toggleTestMode,
  };
}
