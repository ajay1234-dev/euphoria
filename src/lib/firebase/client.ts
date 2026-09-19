import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "fake-api-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-euphoria.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-euphoria",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  db = getFirestore(app);
}

// Use a global flag to ensure emulator connection only happens once across HMR refreshes
const globalEmulators = globalThis as unknown as {
  __FIREBASE_EMULATORS_CONNECTED__?: boolean;
};

if (
  process.env.NEXT_PUBLIC_USE_EMULATORS === "true" &&
  !globalEmulators.__FIREBASE_EMULATORS_CONNECTED__
) {
  globalEmulators.__FIREBASE_EMULATORS_CONNECTED__ = true;

  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
  } catch {
    // Already connected
  }

  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  } catch {
    // Already connected
  }
}

export { app, auth, db };
