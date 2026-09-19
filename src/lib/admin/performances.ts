import {
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  collection,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { performancesRef, performanceRef } from "@/lib/firebase/paths";
import { performanceSchema } from "@/lib/validation/schemas";
import type { Performance } from "@/types/firestore";

export type PerformanceInput = {
  departmentId: string;
  categoryId: string;
  name: string;
  description: string | null;
  order: number;
};

export async function getPerformances(
  eventId: string
): Promise<Array<Performance & { id: string }>> {
  const snap = await getDocs(
    query(performancesRef(eventId), orderBy("order", "asc"))
  );
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function createPerformance(
  eventId: string,
  input: PerformanceInput
): Promise<string> {
  const data = performanceSchema.parse({
    ...input,
    status: "scheduled",
    votingStartedAt: null,
    votingEndsAt: null,
  });
  const ref = await addDoc(collection(db, "events", eventId, "performances"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePerformance(
  eventId: string,
  perfId: string,
  input: Partial<PerformanceInput>
): Promise<void> {
  const existing = await getDoc(performanceRef(eventId, perfId));
  if (!existing.exists()) throw new Error("Performance not found");

  const merged = { ...existing.data(), ...input };
  const data = performanceSchema.parse({
    departmentId: merged.departmentId,
    categoryId: merged.categoryId,
    name: merged.name,
    description: merged.description,
    order: merged.order,
    status: merged.status,
    votingStartedAt: null,
    votingEndsAt: null,
  });

  await setDoc(performanceRef(eventId, perfId), {
    ...data,
    createdAt: existing.data().createdAt,
    updatedAt: serverTimestamp(),
  });
}

/** Reorder performances — rewrites only changed docs in one batch */
export async function reorderPerformances(
  eventId: string,
  orderedIds: string[]
): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(performanceRef(eventId, id), {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/** Delete only allowed for scheduled performances */
export async function deletePerformance(
  eventId: string,
  perfId: string
): Promise<void> {
  const existing = await getDoc(performanceRef(eventId, perfId));
  if (!existing.exists()) throw new Error("Performance not found");
  if (existing.data().status !== "scheduled") {
    throw new Error("Only scheduled performances can be deleted");
  }
  await deleteDoc(performanceRef(eventId, perfId));
}
