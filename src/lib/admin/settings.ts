import {
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { configAppRef } from "@/lib/firebase/paths";
import { checkEmailEligibility } from "@/lib/auth/eligibility";
import { appConfigSchema, type AppConfigInput } from "@/lib/validation/schemas";
import type { AppConfig } from "@/types/firestore";

export async function getAppConfig(): Promise<AppConfig | null> {
  const snap = await getDoc(configAppRef());
  return snap.exists() ? snap.data() : null;
}

/**
 * Call the server-authoritative admin config API route with fresh token.
 */
async function callAdminConfigApi(body: Record<string, unknown>): Promise<boolean> {
  try {
    if (!auth.currentUser) return false;
    const token = await auth.currentUser.getIdToken(/* forceRefresh */ true);
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json.ok === true;
  } catch (err) {
    console.warn("[AdminSettings] API call failed, falling back to client write:", err);
    return false;
  }
}

/**
 * Updates full application configuration. Uses server API route primarily
 * to avoid client permission errors, falling back to client setDoc.
 */
export async function updateAppConfig(input: AppConfigInput): Promise<void> {
  const data = appConfigSchema.parse(input);

  // 1. Try server API first
  const apiSuccess = await callAdminConfigApi(data);
  if (apiSuccess) return;

  // 2. Client fallback
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(/* forceRefresh */ true);
  }
  const existing = await getDoc(configAppRef());

  if (!existing.exists()) {
    await setDoc(configAppRef(), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(configAppRef(), {
      ...existing.data(),
      ...data,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Dedicated, authoritative toggle for Event Day System Gate (eventOpen: true | false).
 * Calls server API to bypass any client permission restrictions.
 */
export async function updateEventGate(open: boolean): Promise<void> {
  // 1. Try server API first
  const apiSuccess = await callAdminConfigApi({ eventOpen: open });
  if (apiSuccess) return;

  // 2. Client fallback with safe defaults matching validConfig rule
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(/* forceRefresh */ true);
  }

  const existing = await getDoc(configAppRef());
  const currentData: Partial<AppConfig> = existing.exists() ? existing.data() : {};

  await setDoc(configAppRef(), {
    festName: currentData.festName || "Euphoria 2026",
    activeEventId: currentData.activeEventId || "default-event",
    allowedEmailDomains: currentData.allowedEmailDomains || ["msec.edu.in", "student.msec.edu.in"],
    blockPlusAddressing: currentData.blockPlusAddressing ?? false,
    requireStudentId: currentData.requireStudentId ?? true,
    studentIdPattern: currentData.studentIdPattern || "^[A-Z0-9-]{3,30}$",
    registrationOpen: currentData.registrationOpen ?? true,
    eventOpen: open,
    sections: currentData.sections || ["A", "B"],
    updatedAt: serverTimestamp(),
  });
}

/**
 * Targeted toggle for registration open/closed.
 * Calls server API first, then falls back to client setDoc.
 */
export async function updateRegistrationStatus(open: boolean): Promise<void> {
  // 1. Try server API first
  const apiSuccess = await callAdminConfigApi({ registrationOpen: open });
  if (apiSuccess) return;

  // 2. Client fallback
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(/* forceRefresh */ true);
  }

  const existing = await getDoc(configAppRef());
  const currentData: Partial<AppConfig> = existing.exists() ? existing.data() : {};

  await setDoc(configAppRef(), {
    festName: currentData.festName || "Euphoria 2026",
    activeEventId: currentData.activeEventId || "default-event",
    allowedEmailDomains: currentData.allowedEmailDomains || ["msec.edu.in", "student.msec.edu.in"],
    blockPlusAddressing: currentData.blockPlusAddressing ?? false,
    requireStudentId: currentData.requireStudentId ?? true,
    studentIdPattern: currentData.studentIdPattern || "^[A-Z0-9-]{3,30}$",
    registrationOpen: open,
    ...(currentData.eventOpen !== undefined ? { eventOpen: currentData.eventOpen } : {}),
    sections: currentData.sections || ["A", "B"],
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check email eligibility against provided settings (client-side UX only).
 * Used by the "Test an email" helper in Settings.
 */
export function testEmailEligibility(
  email: string,
  config: Pick<AppConfig, "allowedEmailDomains" | "blockPlusAddressing" | "studentIdPattern">
): { eligible: boolean; reason?: string } {
  const result = checkEmailEligibility(email, config);
  return result.ok
    ? { eligible: true }
    : { eligible: false, reason: result.reason };
}
