import type { IdTokenResult } from "firebase/auth";

export interface CustomClaims {
  admin?: boolean;
  organizer?: boolean;
}

/** Extract our custom claims from an IdTokenResult */
export function extractClaims(tokenResult: IdTokenResult): CustomClaims {
  return {
    admin: tokenResult.claims["admin"] === true,
    organizer: tokenResult.claims["organizer"] === true,
  };
}

/** Check if an IdTokenResult has the admin claim */
export function isAdminToken(tokenResult: IdTokenResult): boolean {
  return tokenResult.claims["admin"] === true;
}

/** Check if an IdTokenResult has the organizer claim */
export function isOrganizerToken(tokenResult: IdTokenResult): boolean {
  return tokenResult.claims["organizer"] === true;
}
