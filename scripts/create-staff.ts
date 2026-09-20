/**
 * create-staff script — create or update an Admin or Organizer user with email & password and assign claims.
 * Usage:
 *   npx tsx scripts/create-staff.ts admin admin@msec.edu.in AdminPass123!
 *   npx tsx scripts/create-staff.ts organizer organizer@msec.edu.in OrganizerPass123!
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import { FieldValue } from "firebase-admin/firestore";
import { getScriptAuth, getScriptDb } from "./lib/init-admin";

async function createStaff() {
  const role = process.argv[2]?.toLowerCase();
  const email = process.argv[3];
  const password = process.argv[4];

  if (!role || !["admin", "organizer"].includes(role) || !email || !password) {
    console.error("Usage: npx tsx scripts/create-staff.ts <admin|organizer> <email> <password>");
    process.exit(1);
  }

  const auth = getScriptAuth();
  const db = getScriptDb();

  console.log(`\n👤 Setting up ${role.toUpperCase()} account for: ${email}`);

  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`ℹ️ User ${email} already exists (uid: ${user.uid}). Updating password and claims...`);
    await auth.updateUser(user.uid, { password });
  } catch {
    console.log(`✨ Creating new user ${email}...`);
    user = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: role === "admin" ? "Fest Administrator" : "Stage Organizer",
    });
  }

  const existingClaims = user.customClaims ?? {};
  if (role === "admin") {
    await auth.setCustomUserClaims(user.uid, { ...existingClaims, admin: true });
    // Record in adminDirectory
    const now = FieldValue.serverTimestamp();
    await db.collection("adminDirectory").doc(user.uid).set({
      email,
      addedAt: now,
      addedBy: "create-staff-script",
    });
    console.log(`✅ Admin account ready! Login at: /admin/login`);
  } else {
    await auth.setCustomUserClaims(user.uid, { ...existingClaims, organizer: true });
    console.log(`✅ Organizer account ready! Login at: /organizer/login`);
  }

  console.log(`🔑 Email: ${email}`);
  console.log(`🔐 Password: ${password}\n`);
}

createStaff().catch((err) => {
  console.error("❌ create-staff failed:", err);
  process.exit(1);
});
