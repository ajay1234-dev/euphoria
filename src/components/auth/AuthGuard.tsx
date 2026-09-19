"use client";

import { useEffect } from "react";
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
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    if (requireReady && !isRouteAllowed(status, pathname)) {
      const target = resolveRoute(status);
      if (target && target !== pathname) {
        router.replace(target);
      }
    }
  }, [status, pathname, router, requireReady]);

  if (status === "loading") return <PageSkeleton />;

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
