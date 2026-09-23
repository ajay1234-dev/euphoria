/**
 * Admin service — departments CRUD operations.
 * All writes use serverTimestamp() and Zod validation.
 */
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
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { departmentsRef, departmentRef } from "@/lib/firebase/paths";
import { departmentSchema, type DepartmentInput } from "@/lib/validation/schemas";
import type { Department } from "@/types/firestore";

export async function getDepartments(): Promise<Array<Department & { id: string }>> {
  const snap = await getDocs(query(departmentsRef(), orderBy("order", "asc")));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function createDepartment(
  input: DepartmentInput
): Promise<string> {
  const data = departmentSchema.parse(input);
  const ref = await addDoc(collection(db, "departments"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDepartment(
  id: string,
  input: DepartmentInput
): Promise<void> {
  const data = departmentSchema.parse(input);
  const existing = await getDoc(departmentRef(id));
  if (!existing.exists()) throw new Error("Department not found");

  await setDoc(departmentRef(id), {
    ...data,
    createdAt: existing.data().createdAt,
    updatedAt: serverTimestamp(),
  });
}

/** "Archive" = set isActive: false. */
export async function archiveDepartment(id: string): Promise<void> {
  const existing = await getDoc(departmentRef(id));
  if (!existing.exists()) throw new Error("Department not found");

  await setDoc(departmentRef(id), {
    ...existing.data(),
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/** Permanently delete department */
export async function deleteDepartment(id: string): Promise<void> {
  const existing = await getDoc(departmentRef(id));
  if (!existing.exists()) throw new Error("Department not found");
  await deleteDoc(departmentRef(id));
}

