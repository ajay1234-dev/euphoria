import { setDoc, serverTimestamp } from "firebase/firestore";
import { projectionStateRef } from "@/lib/firebase/paths";
import type {
  ProjectionCommand,
  ProjectionStage,
  ProjectionState,
} from "@/types/firestore";
import type { ProjectionSetId } from "@/config/projection";

export async function sendProjectionCommand(
  eventId: string,
  command: ProjectionCommand,
  extra?: Partial<ProjectionState>
): Promise<void> {
  if (!eventId) throw new Error("Event ID is required to send projection command");

  const ref = projectionStateRef(eventId);
  const data: Record<string, any> = {
    command,
    updatedAt: serverTimestamp(),
  };

  if (command === "START" || command === "REPLAY") {
    data.revealSequenceId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    data.currentStage = "Idle";
    data.currentDepartment = null;
    data.currentRank = null;
    data.currentIndex = 0;
  } else if (command === "RESET") {
    data.currentStage = "Idle";
    data.currentDepartment = null;
    data.currentRank = null;
    data.currentIndex = 0;
  } else if (command === "SKIP_TO_FINAL") {
    data.currentStage = "Final Results";
  }


  if (extra) {
    Object.assign(data, extra);
  }

  await setDoc(ref, data as any, { merge: true });
}

export async function setProjectionSet(
  eventId: string,
  selectedSet: ProjectionSetId
): Promise<void> {
  if (!eventId) throw new Error("Event ID is required to set projection set");

  const ref = projectionStateRef(eventId);
  await setDoc(
    ref,
    {
      selectedSet,
      updatedAt: serverTimestamp(),
    } as any,
    { merge: true }
  );
}

export async function updateProjectionProgress(
  eventId: string,
  stage: ProjectionStage,
  department?: string | null,
  rank?: number | null,
  index?: number
): Promise<void> {
  if (!eventId) return;

  const ref = projectionStateRef(eventId);
  await setDoc(
    ref,
    {
      currentStage: stage,
      currentDepartment: department ?? null,
      currentRank: rank ?? null,
      currentIndex: typeof index === "number" ? index : null,
      updatedAt: serverTimestamp(),
    } as any,
    { merge: true }
  );
}

export async function setProjectionTestMode(
  eventId: string,
  isTestMode: boolean
): Promise<void> {
  if (!eventId) return;

  const ref = projectionStateRef(eventId);
  await setDoc(
    ref,
    {
      isTestMode,
      updatedAt: serverTimestamp(),
    } as any,
    { merge: true }
  );
}
