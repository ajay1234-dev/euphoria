import type { IdTokenResult } from "firebase/auth";

export interface CustomClaims {
  admin?: boolean;
}

/** Extract our custom claims from an IdTokenResult */
export function extractClaims(tokenResult: IdTokenResult): CustomClaims {
  return {
    admin: tokenResult.claims["admin"] === true,
  };
}

/** Check if an IdTokenResult has the admin claim */
export function isAdminToken(tokenResult: IdTokenResult): boolean {
  return tokenResult.claims["admin"] === true;
}
