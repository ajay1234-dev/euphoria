import {
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
  collection,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { eventsRef, eventRef, performancesRef } from "@/lib/firebase/paths";
import { festEventSchema, type FestEventInput } from "@/lib/validation/schemas";
import { configAppRef } from "@/lib/firebase/paths";
import type { FestEvent, Performance } from "@/types/firestore";

export async function getEvents(): Promise<Array<FestEvent & { id: string }>> {
  const snap = await getDocs(query(eventsRef(), orderBy("year", "desc")));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function createEvent(
  input: FestEventInput
): Promise<string> {
  const data = festEventSchema.parse(input);
  const ref = await addDoc(collection(db, "events"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create state/current (idle) automatically
  await setDoc(doc(db, "events", ref.id, "state", "current"), {
    status: "idle",
    activePerformanceId: null,
    votingEndsAt: null,
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateEvent(
  id: string,
  input: Partial<FestEventInput>
): Promise<void> {
  const existing = await getDoc(eventRef(id));
  if (!existing.exists()) throw new Error("Event not found");

  const merged = { ...existing.data(), ...input };
  const data = festEventSchema.parse(merged);

  // isTest is immutable
  if (data.isTest !== existing.data().isTest) {
    throw new Error("isTest cannot be changed after creation");
  }

  await setDoc(eventRef(id), {
    ...data,
    createdAt: existing.data().createdAt,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Duplicate an event's lineup (performances) into a target event.
 * New performances get new IDs, status: "scheduled", timestamps reset.
 * No vote data is copied.
 */
export async function duplicateLineup(
  sourceEventId: string,
  targetEventId: string
): Promise<void> {
  const snap = await getDocs(
    query(performancesRef(sourceEventId), orderBy("order", "asc"))
  );

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    const data = d.data() as Performance;
    const newRef = doc(collection(db, "events", targetEventId, "performances"));
    batch.set(newRef, {
      departmentId: data.departmentId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      order: data.order,
      status: "scheduled",
      votingStartedAt: null,
      votingEndsAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

/**
 * Set the active event in config/app.
 * Caller should show a confirmation dialog before calling.
 */
export async function setActiveEvent(eventId: string): Promise<void> {
  const configSnap = await getDoc(configAppRef());
  if (!configSnap.exists()) throw new Error("App config not found");

  await setDoc(configAppRef(), {
    ...configSnap.data(),
    activeEventId: eventId,
    updatedAt: serverTimestamp(),
  });
}
