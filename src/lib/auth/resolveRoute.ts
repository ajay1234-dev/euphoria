export type AuthStatus =
  | "loading"
  | "signed-out"
  | "admin"
  | "not-eligible"
  | "needs-profile"
  | "unverified"
  | "ready";

/**
 * Single source of truth for auth-status → route mapping.
 * Client route guards call this; they are UX only.
 * The real enforcement is Firestore Rules + server-side token verification.
 */
export function resolveRoute(status: AuthStatus): string | null {
  switch (status) {
    case "loading":
      return null; // stay, show skeleton
    case "signed-out":
      return "/login";
    case "admin":
      return "/admin"; // admin users go to the admin console
    case "not-eligible":
      return "/not-eligible";
    case "needs-profile":
      return "/register";
    case "unverified":
      return "/vote";
    case "ready":
      return "/student/dashboard";
  }
}

/** Routes accessible to the given auth status without redirect */
export function isRouteAllowed(status: AuthStatus, pathname: string): boolean {
  // Public routes
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/organizer/login",
    "/admin/login",
    "/forgot-password",
  ];
  if (publicRoutes.some((r) => pathname === r)) return true;

  switch (status) {
    case "loading":
      return true; // don't redirect while loading
    case "signed-out":
      return publicRoutes.some((r) => pathname.startsWith(r));
    case "admin":
      return pathname.startsWith("/admin");
    case "not-eligible":
      return pathname === "/not-eligible";
    case "needs-profile":
      return pathname === "/register" || pathname === "/complete-profile";
    case "unverified":
      return true;
    case "ready":
      return pathname.startsWith("/student") || pathname.startsWith("/vote");
  }
}
