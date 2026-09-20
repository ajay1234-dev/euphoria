#!/usr/bin/env tsx
/**
 * set-organizer script — grant organizer custom claim to a user.
 * Usage: npm run set-organizer -- organizer@example.com
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import { getScriptAuth } from "./lib/init-admin";

async function setOrganizer() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run set-organizer -- <email>");
    process.exit(1);
  }

  const auth = getScriptAuth();

  console.log(`\n🔑 Setting organizer claim for: ${email}\n`);

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    console.error(`❌ No Firebase Auth user found for email: ${email}`);
    console.error(
      "   Create the user first (Firebase Console → Authentication, or run create-staff script)"
    );
    process.exit(1);
  }

  // Get existing claims and set organizer: true
  const existingClaims = user.customClaims ?? {};
  await auth.setCustomUserClaims(user.uid, { ...existingClaims, organizer: true });

  console.log(`✅ Organizer claim granted to ${email} (uid: ${user.uid})`);
  console.log(
    "\n⚠️  IMPORTANT: The user must sign in at /organizer/login for the claim to take effect.\n"
  );
}

setOrganizer().catch((err) => {
  console.error("❌ set-organizer failed:", err);
  process.exit(1);
});
