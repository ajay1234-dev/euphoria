#!/usr/bin/env tsx
/**
 * Bootstrap script — idempotent, safe for production.
 * Creates config/app, one live event, and its state/current.
 * Creates NO sample data and NO fake users.
 *
 * Usage: npm run bootstrap
 * Requires: FIREBASE_ADMIN_* env vars in .env.local
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import { FieldValue } from "firebase-admin/firestore";
import { getScriptDb } from "./lib/init-admin";

async function bootstrap() {
  const db = getScriptDb();
  const now = FieldValue.serverTimestamp();

  console.log("🔧 Bootstrapping Firestore...\n");

  // 1. config/app ──────────────────────────────────────────────────────────────
  const configRef = db.collection("config").doc("app");
  const configSnap = await configRef.get();

  if (!configSnap.exists) {
    await configRef.set({
      festName: "Cultural Fest 2026",
      activeEventId: "main-event-2026",
      allowedEmailDomains: ["college.edu"], // ← PLACEHOLDER: change in Settings
      blockPlusAddressing: true,
      requireStudentId: false,
      studentIdPattern: null,
      registrationOpen: false,
      updatedAt: now,
    });
    console.log("✅ Created config/app");
    console.log(
      "   ⚠️  IMPORTANT: Change allowedEmailDomains in the Admin Settings panel!\n" +
        "      'college.edu' is a placeholder — it must be your real domain.\n"
    );
  } else {
    console.log("ℹ️  config/app already exists — skipping.");
  }

  // 2. events/main-event-2026 ──────────────────────────────────────────────────
  const eventRef = db.collection("events").doc("main-event-2026");
  const eventSnap = await eventRef.get();

  if (!eventSnap.exists) {
    await eventRef.set({
      name: "Cultural Fest 2026",
      year: 2026,
      isTest: false,
      status: "setup",
      defaultVotingDurationSeconds: 60,
      resultsLocked: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log("✅ Created events/main-event-2026");
  } else {
    console.log("ℹ️  events/main-event-2026 already exists — skipping.");
  }

  // 3. events/main-event-2026/state/current ────────────────────────────────────
  const stateRef = eventRef.collection("state").doc("current");
  const stateSnap = await stateRef.get();

  if (!stateSnap.exists) {
    await stateRef.set({
      status: "idle",
      activePerformanceId: null,
      votingEndsAt: null,
      updatedAt: now,
    });
    console.log("✅ Created events/main-event-2026/state/current (idle)");
  } else {
    console.log("ℹ️  state/current already exists — skipping.");
  }

  console.log("\n🎉 Bootstrap complete!");
  console.log("Next steps:");
  console.log("  1. Set your real allowed email domain in Admin → Settings → Registration");
  console.log("  2. Create the first admin: npm run set-admin -- admin@youremail.com");
  console.log("  3. Open registration in Admin → Settings → Registration");
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap failed:", err);
  process.exit(1);
});
