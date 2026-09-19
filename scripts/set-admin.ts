#!/usr/bin/env tsx
/**
 * set-admin script — grant admin custom claim to a user.
 * Usage: npm run set-admin -- someone@example.com
 *
 * This is how the FIRST admin is created:
 *   1. Create the user in Firebase Auth (console or emulator UI)
 *   2. Run: npm run set-admin -- admin@yourdomain.com
 *   3. The user must sign out and sign in again for the claim to take effect.
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import { FieldValue } from "firebase-admin/firestore";
import { getScriptAuth, getScriptDb } from "./lib/init-admin";

async function setAdmin() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run set-admin -- <email>");
    process.exit(1);
  }

  const auth = getScriptAuth();
  const db = getScriptDb();

  console.log(`\n🔑 Setting admin claim for: ${email}\n`);

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    console.error(`❌ No Firebase Auth user found for email: ${email}`);
    console.error(
      "   Create the user first (Firebase Console → Authentication, or emulator UI)"
    );
    process.exit(1);
  }

  // Get existing claims and merge
  const existingClaims = user.customClaims ?? {};
  await auth.setCustomUserClaims(user.uid, { ...existingClaims, admin: true });

  // Write to adminDirectory
  const now = FieldValue.serverTimestamp();
  await db
    .collection("adminDirectory")
    .doc(user.uid)
    .set({
      email: user.email ?? email,
      addedAt: now,
      addedBy: "set-admin-script",
    });

  console.log(`✅ Admin claim granted to ${email} (uid: ${user.uid})`);
  console.log(
    "\n⚠️  IMPORTANT: The user must sign out and sign in again for the claim to take effect.\n" +
      "   If using the admin console, navigate to /admin/login after signing in."
  );
}

setAdmin().catch((err) => {
  console.error("❌ set-admin failed:", err);
  process.exit(1);
});
