"use client";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./client";

/**
 * Pre-configured Google Auth Provider for MSEC College.
 * - Forces the account picker on each sign-in so students with multiple Google accounts
 *   can choose their official college account.
 * - Hints the hosted domain (hd) to msec.edu.in.
 */
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
  hd: "msec.edu.in",
});

/**
 * Authenticate student using Google popup.
 */
export async function signInWithGooglePopup(): Promise<UserCredential> {
  return await signInWithPopup(auth, googleProvider);
}

/**
 * Sign out current authenticated user.
 */
export async function authSignOut(): Promise<void> {
  await signOut(auth);
}
