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
  imageUrl?: string | null;
  participants?: string | null;
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
    imageUrl: input.imageUrl || null,
    participants: input.participants || null,
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
    description: merged.description ?? null,
    order: merged.order,
    status: merged.status,
    votingStartedAt: null,
    votingEndsAt: null,
    imageUrl: merged.imageUrl ?? null,
    participants: merged.participants ?? null,
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

/** Delete a performance and clean up votes */
export async function deletePerformance(
  eventId: string,
  perfId: string
): Promise<void> {
  const existing = await getDoc(performanceRef(eventId, perfId));
  if (!existing.exists()) throw new Error("Performance not found");

  try {
    const votesCollectionRef = collection(
      db,
      "events",
      eventId,
      "performances",
      perfId,
      "votes"
    );
    const votesSnap = await getDocs(votesCollectionRef);
    if (!votesSnap.empty) {
      const batch = writeBatch(db);
      votesSnap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  } catch {}

  await deleteDoc(performanceRef(eventId, perfId));
}

/** Reset all ratings and votes for a performance back to 0 and scheduled */
export async function resetPerformanceRating(
  eventId: string,
  perfId: string
): Promise<void> {
  const perfDocRef = performanceRef(eventId, perfId);
  const snap = await getDoc(perfDocRef);
  if (!snap.exists()) throw new Error("Performance not found");

  // 1. Reset all performance rating fields to 0
  await setDoc(
    perfDocRef,
    {
      status: "scheduled",
      votingStartedAt: null,
      votingEndsAt: null,
      finalizedAt: null,
      totalVotes: 0,
      totalRatingPoints: 0,
      averageRating: 0,
      percentageScore: 0,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
      updatedAt: serverTimestamp(),
    } as any,
    { merge: true }
  );

  // 2. Delete all individual student votes in subcollection
  try {
    const votesCollectionRef = collection(
      db,
      "events",
      eventId,
      "performances",
      perfId,
      "votes"
    );
    const votesSnap = await getDocs(votesCollectionRef);
    if (!votesSnap.empty) {
      const batch = writeBatch(db);
      votesSnap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn("Could not delete subcollection votes:", err);
  }
}

