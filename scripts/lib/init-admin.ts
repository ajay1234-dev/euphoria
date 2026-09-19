/**
 * Admin SDK initialisation for scripts.
 * Does NOT import "server-only" — scripts run in Node directly, not Next.js.
 */
import * as admin from "firebase-admin";

let _app: admin.app.App | null = null;

export function getScriptAdminApp(): admin.app.App {
  if (_app) return _app;

  if (admin.apps.length > 0) {
    _app = admin.app();
    return _app;
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

  if (!isEmulator && clientEmail && privateKey && !privateKey.includes("...")) {
    try {
      _app = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
      return _app;
    } catch {
      // Fallback
    }
  }

  _app = admin.initializeApp({
    projectId,
  });

  return _app;
}

export function getScriptDb(): admin.firestore.Firestore {
  return admin.firestore(getScriptAdminApp());
}

export function getScriptAuth(): admin.auth.Auth {
  return admin.auth(getScriptAdminApp());
}
