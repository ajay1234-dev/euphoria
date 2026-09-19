import {
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { categoriesRef, categoryRef } from "@/lib/firebase/paths";
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas";
import type { Category } from "@/types/firestore";

export async function getCategories(): Promise<Array<Category & { id: string }>> {
  const snap = await getDocs(query(categoriesRef(), orderBy("order", "asc")));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function createCategory(input: CategoryInput): Promise<string> {
  const data = categorySchema.parse(input);
  const ref = await addDoc(collection(db, "categories"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(
  id: string,
  input: CategoryInput
): Promise<void> {
  const data = categorySchema.parse(input);
  const existing = await getDoc(categoryRef(id));
  if (!existing.exists()) throw new Error("Category not found");

  await setDoc(categoryRef(id), {
    ...data,
    createdAt: existing.data().createdAt,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveCategory(id: string): Promise<void> {
  const existing = await getDoc(categoryRef(id));
  if (!existing.exists()) throw new Error("Category not found");
  await setDoc(categoryRef(id), {
    ...existing.data(),
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}
