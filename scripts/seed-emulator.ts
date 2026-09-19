#!/usr/bin/env tsx
/**
 * seed-emulator script — populates the emulator with sample data.
 * REFUSES to run unless emulator env vars are set.
 *
 * Usage: npm run seed:emulator
 *
 * Credentials printed at end of run.
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// Guard: refuse to run unless emulators are configured
const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreEmulator = process.env.FIRESTORE_EMULATOR_HOST;

if (!authEmulator || !firestoreEmulator) {
  console.error(
    "❌ Emulator env vars not set!\n" +
      "   Set FIREBASE_AUTH_EMULATOR_HOST=localhost:9099\n" +
      "   Set FIRESTORE_EMULATOR_HOST=localhost:8080\n" +
      "   in your .env.local before running this script.\n" +
      "\n" +
      "   This script refuses to run against a real Firebase project."
  );
  process.exit(1);
}

import { FieldValue } from "firebase-admin/firestore";
import { getScriptAuth, getScriptDb } from "./lib/init-admin";
import {
  SEED_CONFIG,
  SEED_DEPARTMENTS,
  SEED_CATEGORIES,
  SEED_EVENT,
  SEED_PERFORMANCES,
  SEED_VOTING_STATE,
  SEED_ADMIN,
  SEED_STUDENTS,
} from "../src/lib/sample-data";

async function seed() {
  const db = getScriptDb();
  const auth = getScriptAuth();
  const now = FieldValue.serverTimestamp();

  console.log("🌱 Seeding emulator...\n");

  // 1. config/app ──────────────────────────────────────────────────────────────
  await db.collection("config").doc("app").set({
    ...SEED_CONFIG,
    updatedAt: now,
  });
  console.log("✅ config/app");

  // 2. Departments ──────────────────────────────────────────────────────────────
  const batch1 = db.batch();
  for (const dept of SEED_DEPARTMENTS) {
    const { id, ...data } = dept;
    batch1.set(db.collection("departments").doc(id), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch1.commit();
  console.log(`✅ ${SEED_DEPARTMENTS.length} departments`);

  // 3. Categories ───────────────────────────────────────────────────────────────
  const batch2 = db.batch();
  for (const cat of SEED_CATEGORIES) {
    const { id, ...data } = cat;
    batch2.set(db.collection("categories").doc(id), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch2.commit();
  console.log(`✅ ${SEED_CATEGORIES.length} categories`);

  // 4. Test event + state ───────────────────────────────────────────────────────
  const { id: eventId, ...eventData } = SEED_EVENT;
  await db.collection("events").doc(eventId).set({
    ...eventData,
    createdAt: now,
    updatedAt: now,
  });
  await db
    .collection("events")
    .doc(eventId)
    .collection("state")
    .doc("current")
    .set({ ...SEED_VOTING_STATE, updatedAt: now });
  console.log(`✅ event: ${eventId} + state/current`);

  // 5. Performances ─────────────────────────────────────────────────────────────
  const batch3 = db.batch();
  for (const perf of SEED_PERFORMANCES) {
    const { id, ...data } = perf;
    batch3.set(
      db.collection("events").doc(eventId).collection("performances").doc(id),
      { ...data, createdAt: now, updatedAt: now }
    );
  }
  await batch3.commit();
  console.log(`✅ ${SEED_PERFORMANCES.length} performances`);

  // 6. Admin user ───────────────────────────────────────────────────────────────
  let adminUid: string;
  try {
    const existing = await auth.getUserByEmail(SEED_ADMIN.email);
    adminUid = existing.uid;
    console.log(`ℹ️  Admin user already exists: ${SEED_ADMIN.email}`);
  } catch {
    const created = await auth.createUser({
      email: SEED_ADMIN.email,
      password: SEED_ADMIN.password,
      emailVerified: true,
    });
    adminUid = created.uid;
    console.log(`✅ Admin user created: ${SEED_ADMIN.email}`);
  }
  await auth.setCustomUserClaims(adminUid, { admin: true });
  await db.collection("adminDirectory").doc(adminUid).set({
    email: SEED_ADMIN.email,
    addedAt: now,
    addedBy: "seed-script",
  });
  console.log(`✅ Admin claim set + adminDirectory entry`);

  // 7. Student users ────────────────────────────────────────────────────────────
  for (const student of SEED_STUDENTS) {
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(student.email);
      uid = existing.uid;
    } catch {
      const created = await auth.createUser({
        email: student.email,
        password: student.password,
        emailVerified: true,
      });
      uid = created.uid;
    }
    // Write user profile
    await db.collection("users").doc(uid).set({
      uid,
      fullName: student.fullName,
      email: student.email,
      emailDomain: student.email.split("@")[1],
      studentId: null,
      departmentId: student.departmentId,
      emailVerified: true,
      verifiedAt: now,
      createdAt: now,
    });
  }
  console.log(`✅ ${SEED_STUDENTS.length} student users`);

  console.log("\n🎉 Seed complete!\n");
  console.log("─────────────────────────────────────────────────");
  console.log("  Admin:    " + SEED_ADMIN.email);
  console.log("  Password: " + SEED_ADMIN.password);
  console.log("  Login at: http://localhost:3000/admin/login");
  console.log("─────────────────────────────────────────────────");
  for (const s of SEED_STUDENTS) {
    console.log(`  Student: ${s.email}  /  ${s.password}`);
  }
  console.log("─────────────────────────────────────────────────\n");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
