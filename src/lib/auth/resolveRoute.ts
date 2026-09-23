export type AuthStatus =
  | "loading"
  | "signed-out"
  | "admin"
  | "organizer"
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
      return "/"; // Always redirect signed-out users back to the landing page
    case "admin":
      return "/admin"; // admin users go to the admin console
    case "organizer":
      return "/admin"; // legacy organizer redirected to admin console
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
    "/admin/login",
    "/forgot-password",
    "/projector/timer",
    "/projector/results",
  ];
  if (publicRoutes.some((r) => pathname === r || pathname.startsWith(r))) return true;

  switch (status) {
    case "loading":
      return true; // don't redirect while loading
    case "signed-out":
      return publicRoutes.some((r) => pathname.startsWith(r));
    case "admin":
      // admins can access admin console, stage projector screens
      return pathname.startsWith("/admin") || pathname.startsWith("/projector");
    case "organizer":
      return pathname.startsWith("/admin") || pathname.startsWith("/projector");
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
