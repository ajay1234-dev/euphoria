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

export async function updateAppConfig(input: AppConfigInput): Promise<void> {
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(/* forceRefresh */ true);
  }
  const data = appConfigSchema.parse(input);
  const existing = await getDoc(configAppRef());

  if (!existing.exists()) {
    // Bootstrap case
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
 * Targeted toggle for registration open/closed.
 * Force-refreshes token so Firestore rules receive an ID token with the admin claim,
 * and uses setDoc with existing/fallback data so validConfig rule always passes.
 */
export async function updateRegistrationStatus(open: boolean): Promise<void> {
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
