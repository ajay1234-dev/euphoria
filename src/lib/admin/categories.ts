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
import { categoriesRef, categoryRef } from "@/lib/firebase/paths";
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas";
import type { Category } from "@/types/firestore";

export const STANDARD_FEST_CATEGORIES = [
  { slug: "boys-dance", name: "Boys Dance", description: "Boys Dance Performance", order: 0 },
  { slug: "girls-dance", name: "Girls Dance", description: "Girls Dance Performance", order: 1 },
  { slug: "boys-singing", name: "Boys Singing", description: "Boys Vocal & Singing Performance", order: 2 },
  { slug: "girls-singing", name: "Girls Singing", description: "Girls Vocal & Singing Performance", order: 3 },
  { slug: "instrumental-music", name: "Instrumental Music", description: "Solo and Ensemble Instrumental Performance", order: 4 },
];

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

/** Permanently delete category */
export async function deleteCategory(id: string): Promise<void> {
  const existing = await getDoc(categoryRef(id));
  if (!existing.exists()) throw new Error("Category not found");
  await deleteDoc(categoryRef(id));
}


/**
 * Ensures standard split categories (Boys Dance, Girls Dance, Boys Singing,
 * Girls Singing, Instrumental Music) are ready in Firestore.
 */
export async function ensureStandardCategories(): Promise<Record<string, string>> {
  try {
    const existing = await getCategories();
    const slugToId: Record<string, string> = {};
    existing.forEach((c) => {
      slugToId[c.slug] = c.id;
    });

    for (const cat of STANDARD_FEST_CATEGORIES) {
      if (!slugToId[cat.slug]) {
        const id = await createCategory({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          order: cat.order,
          isActive: true,
          includeInOverall: true,
          overallWeight: 1,
        });
        slugToId[cat.slug] = id;
      }
    }
    return slugToId;
  } catch (err) {
    console.warn("Could not auto-ensure categories:", err);
    return {};
  }
}
