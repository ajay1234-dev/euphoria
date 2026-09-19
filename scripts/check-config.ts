import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import { getScriptDb } from "./lib/init-admin";

async function main() {
  const db = getScriptDb();
  console.log("Checking Firestore config/app...");
  const snap = await db.collection("config").doc("app").get();
  if (!snap.exists) {
    console.log("config/app does NOT exist!");
  } else {
    console.log("config/app data:", JSON.stringify(snap.data(), null, 2));
  }
}

main().catch(console.error);
