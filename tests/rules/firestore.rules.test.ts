/**
 * Firestore Security Rules Unit Tests
 * Run with: npm run test:rules
 * Requires the Firestore emulator to be running.
 *
 * All 11 test groups from spec §8.1
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";

const PROJECT_ID = "demo-euphoria";
const RULES_FILE = resolve(__dirname, "../../firestore.rules");

let testEnv: RulesTestEnvironment;

// Helper to get Firestore for a context
function asUser(uid: string, email: string, emailVerified = false, admin = false) {
  return testEnv.authenticatedContext(uid, {
    email,
    email_verified: emailVerified,
    ...(admin ? { admin: true } : {}),
  });
}

function asAnon() {
  return testEnv.unauthenticatedContext();
}

// Seed base config/app for all tests
const BASE_CONFIG = {
  festName: "Test Fest",
  activeEventId: "event-001",
  allowedEmailDomains: ["college.test"],
  blockPlusAddressing: true,
  requireStudentId: false,
  studentIdPattern: null,
  registrationOpen: true,
  updatedAt: Timestamp.now(),
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_FILE, "utf8"),
      host: "localhost",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed config and departments for tests that need them
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "config", "app"), BASE_CONFIG);
    await setDoc(doc(db, "departments", "dept-001"), {
      name: "Dance Club",
      shortName: "Dance",
      color: "#3B4CCA",
      order: 0,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "categories", "cat-001"), {
      name: "Classical Dance",
      slug: "classical-dance",
      description: "Traditional dance.",
      order: 0,
      isActive: true,
      includeInOverall: true,
      overallWeight: 1,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "events", "event-001"), {
      name: "Fest 2026",
      year: 2026,
      isTest: false,
      status: "setup",
      defaultVotingDurationSeconds: 60,
      resultsLocked: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "events", "event-001", "state", "current"), {
      status: "idle",
      activePerformanceId: null,
      votingEndsAt: null,
      updatedAt: Timestamp.now(),
    });
  });
});

// ── Test Group 1: Unauthenticated access ─────────────────────────────────────
describe("1. Unauthenticated", () => {
  it("CAN read config/app", async () => {
    const db = asAnon().firestore();
    await assertSucceeds(getDoc(doc(db, "config", "app")));
  });

  it("CAN read departments", async () => {
    const db = asAnon().firestore();
    await assertSucceeds(getDocs(collection(db, "departments")));
  });

  it("CANNOT read users", async () => {
    const db = asAnon().firestore();
    await assertFails(getDocs(collection(db, "users")));
  });

  it("CANNOT read categories", async () => {
    const db = asAnon().firestore();
    await assertFails(getDocs(collection(db, "categories")));
  });

  it("CANNOT read events", async () => {
    const db = asAnon().firestore();
    await assertFails(getDocs(collection(db, "events")));
  });

  it("CANNOT write config/app", async () => {
    const db = asAnon().firestore();
    await assertFails(
      setDoc(doc(db, "config", "app"), { ...BASE_CONFIG })
    );
  });
});

// ── Test Group 2: Personal email (non-college) ────────────────────────────────
describe("2. Personal email user (@gmail.com)", () => {
  const uid = "gmail-user-1";
  const email = "user@gmail.com";

  it("CANNOT create a profile", async () => {
    const db = asUser(uid, email, false).firestore();
    await assertFails(
      setDoc(doc(db, "users", uid), {
        uid,
        fullName: "Test User",
        email,
        emailDomain: "gmail.com",
        studentId: null,
        departmentId: null,
        emailVerified: false,
        verifiedAt: null,
        createdAt: serverTimestamp(),
      })
    );
  });

  it("CANNOT read events", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertFails(getDocs(collection(db, "events")));
  });

  it("CANNOT read categories", async () => {
    const db = asUser(uid, email, false).firestore();
    await assertFails(getDocs(collection(db, "categories")));
  });
});

// ── Test Group 3: College email unverified user ───────────────────────────────
describe("3. College email unverified user", () => {
  const uid = "college-unverified-1";
  const email = "student@college.test";

  const validProfile = {
    uid,
    fullName: "Jane Student",
    email,
    emailDomain: "college.test",
    studentId: null,
    departmentId: null,
    emailVerified: false,
    verifiedAt: null,
    createdAt: serverTimestamp(),
  };

  it("CAN create own profile while registrationOpen", async () => {
    const db = asUser(uid, email, false).firestore();
    await assertSucceeds(setDoc(doc(db, "users", uid), validProfile));
  });

  it("CANNOT create profile when registration is closed", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "config", "app"), {
        ...BASE_CONFIG,
        registrationOpen: false,
        updatedAt: Timestamp.now(),
      });
    });
    const db = asUser(uid, email, false).firestore();
    await assertFails(setDoc(doc(db, "users", uid), validProfile));
  });

  it("CANNOT create profile for another uid", async () => {
    const db = asUser(uid, email, false).firestore();
    await assertFails(
      setDoc(doc(db, "users", "other-uid"), { ...validProfile, uid: "other-uid" })
    );
  });

  it("CANNOT create profile with mismatched email", async () => {
    const db = asUser(uid, email, false).firestore();
    await assertFails(
      setDoc(doc(db, "users", uid), {
        ...validProfile,
        email: "wrong@college.test",
      })
    );
  });

  it("CANNOT create profile with extra fields", async () => {
    const db = asUser(uid, email, false).firestore();
    await assertFails(
      setDoc(doc(db, "users", uid), {
        ...validProfile,
        extraField: "not allowed",
      })
    );
  });

  it("CANNOT create profile with emailVerified: true when token is unverified", async () => {
    const db = asUser(uid, email, false).firestore();
    await assertFails(
      setDoc(doc(db, "users", uid), {
        ...validProfile,
        emailVerified: true,
      })
    );
  });

  it("CANNOT read events", async () => {
    const db = asUser(uid, email, false).firestore();
    await assertFails(getDocs(collection(db, "events")));
  });

  it("CANNOT read performances", async () => {
    const db = asUser(uid, email, false).firestore();
    await assertFails(
      getDocs(collection(db, "events", "event-001", "performances"))
    );
  });
});

// ── Test Group 4: Plus alias blocking ────────────────────────────────────────
describe("4. Plus alias email handling", () => {
  const uid = "plus-alias-user";
  const aliasEmail = "student+1@college.test";
  const baseEmail = "student@college.test";

  const profileBase = (email: string) => ({
    uid,
    fullName: "Plus User",
    email,
    emailDomain: "college.test",
    studentId: null,
    departmentId: null,
    emailVerified: false,
    verifiedAt: null,
    createdAt: serverTimestamp(),
  });

  it("+ alias is REJECTED when blockPlusAddressing is true", async () => {
    const db = asUser(uid, aliasEmail, false).firestore();
    await assertFails(setDoc(doc(db, "users", uid), profileBase(aliasEmail)));
  });

  it("+ alias is ALLOWED when blockPlusAddressing is false", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "config", "app"), {
        ...BASE_CONFIG,
        blockPlusAddressing: false,
        updatedAt: Timestamp.now(),
      });
    });
    const db = asUser(uid, aliasEmail, false).firestore();
    await assertSucceeds(setDoc(doc(db, "users", uid), profileBase(aliasEmail)));
  });

  it("base email is always allowed", async () => {
    const db = asUser(uid, baseEmail, false).firestore();
    await assertSucceeds(setDoc(doc(db, "users", uid), profileBase(baseEmail)));
  });
});

// ── Test Group 5: Verified student ───────────────────────────────────────────
describe("5. Verified student", () => {
  const uid = "verified-student-1";
  const email = "verified@college.test";

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", uid), {
        uid,
        fullName: "Verified Student",
        email,
        emailDomain: "college.test",
        studentId: null,
        departmentId: null,
        emailVerified: true,
        verifiedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      });
    });
  });

  it("CAN read categories", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertSucceeds(getDocs(collection(db, "categories")));
  });

  it("CAN read events", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertSucceeds(getDocs(collection(db, "events")));
  });

  it("CAN read performances", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertSucceeds(
      getDocs(collection(db, "events", "event-001", "performances"))
    );
  });

  it("CAN read state/current", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertSucceeds(
      getDoc(doc(db, "events", "event-001", "state", "current"))
    );
  });

  it("CAN read own profile", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertSucceeds(getDoc(doc(db, "users", uid)));
  });

  it("CANNOT read another user's profile", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertFails(getDoc(doc(db, "users", "other-uid")));
  });

  it("CANNOT write config", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertFails(
      setDoc(doc(db, "config", "app"), { ...BASE_CONFIG })
    );
  });

  it("CANNOT write departments", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertFails(
      setDoc(doc(db, "departments", "new-dept"), {
        name: "Test",
        shortName: "T",
        color: "#000000",
        order: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("CANNOT write events", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertFails(
      setDoc(doc(db, "events", "new-event"), {
        name: "Test",
        year: 2026,
        isTest: false,
        status: "setup",
        defaultVotingDurationSeconds: 60,
        resultsLocked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });
});

// ── Test Group 6: Verified student profile update ────────────────────────────
describe("6. Verified student profile update rules", () => {
  const uid = "update-test-student";
  const email = "updatetest@college.test";

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", uid), {
        uid,
        fullName: "Update Test",
        email,
        emailDomain: "college.test",
        studentId: null,
        departmentId: null,
        emailVerified: false,
        verifiedAt: null,
        createdAt: Timestamp.now(),
      });
    });
  });

  it("CAN flip emailVerified false→true when token is verified", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "users", uid), {
        emailVerified: true,
        verifiedAt: serverTimestamp(),
      })
    );
  });

  it("CANNOT change fullName", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertFails(
      updateDoc(doc(db, "users", uid), { fullName: "Hacker Name" })
    );
  });

  it("CANNOT change email", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertFails(
      updateDoc(doc(db, "users", uid), { email: "other@college.test" })
    );
  });

  it("CANNOT change studentId", async () => {
    const db = asUser(uid, email, true).firestore();
    await assertFails(
      updateDoc(doc(db, "users", uid), { studentId: "STU123" })
    );
  });

  it("CANNOT flip emailVerified true→false", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", uid), {
        uid,
        fullName: "Update Test",
        email,
        emailDomain: "college.test",
        studentId: null,
        departmentId: null,
        emailVerified: true,
        verifiedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      });
    });
    const db = asUser(uid, email, true).firestore();
    await assertFails(
      updateDoc(doc(db, "users", uid), { emailVerified: false, verifiedAt: null })
    );
  });
});

// ── Test Group 7: Student ID claims ──────────────────────────────────────────
describe("7. Student ID claims", () => {
  it("malformed ID is rejected", async () => {
    const uid = "claim-test-uid";
    const db = asUser(uid, "claimtest@college.test", false).firestore();
    await assertFails(
      setDoc(doc(db, "studentIdClaims", "invalid id!"), {
        uid,
        createdAt: serverTimestamp(),
      })
    );
  });

  it("claim with foreign uid is rejected", async () => {
    const uid = "claim-uid-1";
    const db = asUser(uid, "claim1@college.test", false).firestore();
    await assertFails(
      setDoc(doc(db, "studentIdClaims", "STU001"), {
        uid: "other-uid",
        createdAt: serverTimestamp(),
      })
    );
  });
});

// ── Test Group 8: Admin writes ────────────────────────────────────────────────
describe("8. Admin writes", () => {
  const adminUid = "admin-uid-1";
  const adminEmail = "admin@example.com";

  it("CAN write valid config", async () => {
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertSucceeds(
      setDoc(doc(db, "config", "app"), {
        ...BASE_CONFIG,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("CANNOT write config with bad shape (missing field)", async () => {
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    const { festName: _removed, ...badConfig } = BASE_CONFIG;
    await assertFails(
      setDoc(doc(db, "config", "app"), {
        ...badConfig,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("CANNOT write department with invalid hex color", async () => {
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertFails(
      setDoc(doc(db, "departments", "dept-bad"), {
        name: "Bad Dept",
        shortName: "Bad",
        color: "notahex",
        order: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("CAN write valid department", async () => {
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertSucceeds(
      setDoc(doc(db, "departments", "dept-new"), {
        name: "New Dept",
        shortName: "New",
        color: "#AABBCC",
        order: 1,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("CAN write valid performance with existing dept+cat refs", async () => {
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertSucceeds(
      setDoc(doc(db, "events", "event-001", "performances", "perf-new"), {
        departmentId: "dept-001",
        categoryId: "cat-001",
        name: "Test Performance",
        description: null,
        order: 0,
        status: "scheduled",
        votingStartedAt: null,
        votingEndsAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("CANNOT write performance with non-existent departmentId", async () => {
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertFails(
      setDoc(doc(db, "events", "event-001", "performances", "perf-bad"), {
        departmentId: "nonexistent-dept",
        categoryId: "cat-001",
        name: "Bad Performance",
        description: null,
        order: 0,
        status: "scheduled",
        votingStartedAt: null,
        votingEndsAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("CANNOT change isTest after creation", async () => {
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertFails(
      setDoc(doc(db, "events", "event-001"), {
        name: "Fest 2026",
        year: 2026,
        isTest: true, // changed!
        status: "setup",
        defaultVotingDurationSeconds: 60,
        resultsLocked: false,
        createdAt: Timestamp.now(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("CANNOT change performance status (Phase 1)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "events", "event-001", "performances", "perf-p8"),
        {
          departmentId: "dept-001",
          categoryId: "cat-001",
          name: "Existing Perf",
          description: null,
          order: 0,
          status: "scheduled",
          votingStartedAt: null,
          votingEndsAt: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
      );
    });
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertFails(
      setDoc(doc(db, "events", "event-001", "performances", "perf-p8"), {
        departmentId: "dept-001",
        categoryId: "cat-001",
        name: "Existing Perf",
        description: null,
        order: 0,
        status: "live", // changed!
        votingStartedAt: null,
        votingEndsAt: null,
        createdAt: Timestamp.now(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("CANNOT delete departments", async () => {
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertFails(deleteDoc(doc(db, "departments", "dept-001")));
  });

  it("CANNOT delete events", async () => {
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertFails(deleteDoc(doc(db, "events", "event-001")));
  });

  it("CAN delete a scheduled performance", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "events", "event-001", "performances", "perf-del"),
        {
          departmentId: "dept-001",
          categoryId: "cat-001",
          name: "Deletable",
          description: null,
          order: 0,
          status: "scheduled",
          votingStartedAt: null,
          votingEndsAt: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
      );
    });
    const db = asUser(adminUid, adminEmail, true, true).firestore();
    await assertSucceeds(
      deleteDoc(doc(db, "events", "event-001", "performances", "perf-del"))
    );
  });
});

// ── Test Group 9: adminDirectory cannot be written by non-admin ───────────────
describe("9. adminDirectory write protection", () => {
  it("non-admin CANNOT write adminDirectory", async () => {
    const db = asUser("student-x", "student@college.test", true).firestore();
    await assertFails(
      setDoc(doc(db, "adminDirectory", "student-x"), {
        email: "student@college.test",
        addedAt: serverTimestamp(),
        addedBy: "self",
      })
    );
  });

  it("even admin token cannot write adminDirectory (server-only)", async () => {
    const db = asUser("admin-x", "admin@example.com", true, true).firestore();
    await assertFails(
      setDoc(doc(db, "adminDirectory", "admin-x"), {
        email: "admin@example.com",
        addedAt: serverTimestamp(),
        addedBy: "self",
      })
    );
  });
});

// ── Test Group 10: Domain change takes immediate effect ───────────────────────
describe("10. allowedEmailDomains change takes immediate effect", () => {
  it("previously blocked domain is allowed after config update", async () => {
    // student with new domain
    const uid = "newdomain-user";
    const email = "student@newdomain.test";

    // Currently blocked
    const db1 = asUser(uid, email, false).firestore();
    await assertFails(
      setDoc(doc(db1, "users", uid), {
        uid,
        fullName: "New Domain User",
        email,
        emailDomain: "newdomain.test",
        studentId: null,
        departmentId: null,
        emailVerified: false,
        verifiedAt: null,
        createdAt: serverTimestamp(),
      })
    );

    // Add domain to config
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "config", "app"), {
        ...BASE_CONFIG,
        allowedEmailDomains: ["college.test", "newdomain.test"],
        updatedAt: Timestamp.now(),
      });
    });

    // Now allowed
    const db2 = asUser(uid, email, false).firestore();
    await assertSucceeds(
      setDoc(doc(db2, "users", uid), {
        uid,
        fullName: "New Domain User",
        email,
        emailDomain: "newdomain.test",
        studentId: null,
        departmentId: null,
        emailVerified: false,
        verifiedAt: null,
        createdAt: serverTimestamp(),
      })
    );
  });
});

// ── Test Group 11: Default deny (Phase 2 reserved paths) ─────────────────────
describe("11. Default deny on reserved paths", () => {
  const uid = "admin-deny-test";
  const adminEmail = "admin@example.com";

  it("CANNOT read events/*/votes/* (Phase 2 reserved)", async () => {
    const db = asUser(uid, adminEmail, true, true).firestore();
    await assertFails(
      getDoc(doc(db, "events", "event-001", "votes", "vote-001"))
    );
  });

  it("CANNOT write events/*/votes/*", async () => {
    const db = asUser(uid, adminEmail, true, true).firestore();
    await assertFails(
      setDoc(doc(db, "events", "event-001", "votes", "vote-001"), {
        rating: 5,
        uid,
      })
    );
  });

  it("CANNOT read events/*/results/*", async () => {
    const db = asUser(uid, adminEmail, true, true).firestore();
    await assertFails(
      getDoc(doc(db, "events", "event-001", "results", "perf-001"))
    );
  });

  it("CANNOT read unknown top-level collection", async () => {
    const db = asUser(uid, adminEmail, true, true).firestore();
    await assertFails(getDocs(collection(db, "unknownCollection")));
  });
});
