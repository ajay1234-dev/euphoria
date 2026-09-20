"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { resolveRoute, isRouteAllowed } from "@/lib/auth/resolveRoute";
import { PageSkeleton } from "@/components/common/PageSkeleton";

interface AuthGuardProps {
  children: React.ReactNode;
  /** If true, the route is accessible only when status === 'ready' */
  requireReady?: boolean;
}

export function AuthGuard({ children, requireReady = true }: AuthGuardProps) {
  const { status, user, studentProfile, refreshAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "loading" || refreshing) return;

    // If already ready or studentProfile is present, stay on page
    if (status === "ready" || !!studentProfile) return;

    if (requireReady && !isRouteAllowed(status, pathname)) {
      // If user is authenticated with Google, re-check Firestore before kicking out
      if (user && status === "needs-profile") {
        setRefreshing(true);
        refreshAuth().finally(() => setRefreshing(false));
        return;
      }

      const target = resolveRoute(status);
      if (target && target !== pathname) {
        router.replace(target);
      }
    }
  }, [status, pathname, router, requireReady, user, studentProfile, refreshAuth, refreshing]);

  if (status === "loading" || refreshing) return <PageSkeleton />;

  return <>{children}</>;
}

/**
 * AdminGuard — protects /admin/(console)/* routes.
 * UX-only: real protection is Firestore Rules + server-side token verification.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "admin") {
      router.replace("/admin/login");
    }
  }, [status, router]);

  if (status === "loading") return <PageSkeleton />;
  if (status !== "admin") return null;

  return <>{children}</>;
}

/**
 * OrganizerGuard — protects /organizer/dashboard.
 * Organizers and Admins can access.
 */
export function OrganizerGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "organizer" && status !== "admin") {
      router.replace("/organizer/login");
    }
  }, [status, router]);

  if (status === "loading") return <PageSkeleton />;
  if (status !== "organizer" && status !== "admin") return null;

  return <>{children}</>;
}

