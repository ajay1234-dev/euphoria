import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalise a Student ID: uppercase, strip everything except A–Z 0–9 - */
export function normalizeStudentId(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

/** Lowercase an email, trim whitespace */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Extract domain from an email address */
export function emailDomain(email: string): string {
  return email.split("@")[1] ?? "";
}

/** Extract local part from an email address */
export function emailLocal(email: string): string {
  return email.split("@")[0] ?? "";
}

/** Format a Firestore Timestamp as a locale date string */
export function formatDate(ts: { toDate(): Date } | null | undefined): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a Firestore Timestamp as a locale date+time string */
export function formatDateTime(
  ts: { toDate(): Date } | null | undefined
): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Sleep for n milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a URL-friendly slug from a string */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
