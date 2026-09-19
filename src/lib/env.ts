import { z } from "zod";

// ── Client-side env (prefixed NEXT_PUBLIC_) ───────────────────────────────────
const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "Missing NEXT_PUBLIC_FIREBASE_API_KEY"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "Missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "Missing NEXT_PUBLIC_FIREBASE_APP_ID"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, "Missing NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NEXT_PUBLIC_USE_EMULATORS: z.enum(["true", "false"]).default("false"),
});

// ── Server-side env (never NEXT_PUBLIC_) ──────────────────────────────────────
const serverEnvSchema = z.object({
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1, "Missing FIREBASE_ADMIN_PROJECT_ID"),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email("Invalid FIREBASE_ADMIN_CLIENT_EMAIL"),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1, "Missing FIREBASE_ADMIN_PRIVATE_KEY"),
});

function parseEnv<T extends z.ZodTypeAny>(schema: T, env: NodeJS.ProcessEnv): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `  • ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`\n❌ Invalid environment variables:\n${messages}\n\nCheck your .env.local file.\n`);
  }
  return result.data as z.infer<T>;
}

export const clientEnv = parseEnv(clientEnvSchema, process.env);

// Server env is only parsed on the server
export function getServerEnv() {
  return parseEnv(serverEnvSchema, process.env);
}
