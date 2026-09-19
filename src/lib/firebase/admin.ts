import "server-only";
import * as admin from "firebase-admin";

// Singleton — only initialise once per server process
function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "demo-euphoria";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const privateKey = rawKey?.replace(/\\n/g, "\n");

  const isEmulator = !!(
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  );

  // When targeting emulator or in build environment with dummy key, do not invoke cert() decoder
  if (!isEmulator && clientEmail && privateKey && !privateKey.includes("...")) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    } catch {
      // Fallback to projectId
    }
  }

  return admin.initializeApp({
    projectId,
  });
}

const adminApp = getAdminApp();

export const adminAuth = admin.auth(adminApp);
export const adminDb = admin.firestore(adminApp);
