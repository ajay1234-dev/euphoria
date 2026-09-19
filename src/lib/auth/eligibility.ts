import type { AppConfig } from "@/types/firestore";
import { emailDomain, emailLocal } from "@/lib/utils";

export type EligibilityResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Pure function — shared between the registration form and rules tests.
 * Checks whether an email is eligible given the current AppConfig.
 */
export function checkEmailEligibility(
  email: string,
  config: Pick<
    AppConfig,
    "allowedEmailDomains" | "blockPlusAddressing"
  >
): EligibilityResult {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed.includes("@")) {
    return { ok: false, reason: "Enter a valid email address." };
  }

  const domain = emailDomain(trimmed);
  const local = emailLocal(trimmed);

  const allowed = config.allowedEmailDomains.map((d) => d.toLowerCase());
  if (!allowed.includes(domain)) {
    const hint =
      allowed.length === 1
        ? `@${allowed[0]}`
        : allowed.map((d) => `@${d}`).join(" or ");
    return {
      ok: false,
      reason: `Only official college emails are allowed (${hint}).`,
    };
  }

  if (config.blockPlusAddressing && local.includes("+")) {
    return {
      ok: false,
      reason: "Email aliases with '+' are not allowed. Use your base email address.",
    };
  }

  return { ok: true };
}

/**
 * Build a user-facing hint string from the allowed domains list.
 * E.g. "Use your official college email (@college.edu)"
 */
export function buildEmailHint(config: Pick<AppConfig, "allowedEmailDomains">): string {
  const domains = config.allowedEmailDomains;
  if (domains.length === 0) return "Use your official college email.";
  const formatted = domains.map((d) => `@${d}`).join(", ");
  return `Use your official college email (${formatted})`;
}
