import {
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { configAppRef } from "@/lib/firebase/paths";
import { checkEmailEligibility } from "@/lib/auth/eligibility";
import { appConfigSchema, type AppConfigInput } from "@/lib/validation/schemas";
import type { AppConfig } from "@/types/firestore";

export async function getAppConfig(): Promise<AppConfig | null> {
  const snap = await getDoc(configAppRef());
  return snap.exists() ? snap.data() : null;
}

export async function updateAppConfig(input: AppConfigInput): Promise<void> {
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
