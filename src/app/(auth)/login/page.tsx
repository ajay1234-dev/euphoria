"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig } from "@/hooks/useData";
import { isValidCollegeEmail } from "@/config/departments";
import { signInWithGooglePopup, authSignOut } from "@/lib/firebase/auth-google";
import { FestBackground } from "@/components/common/FestBackground";
import { Logo } from "@/components/common/Logo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import {
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  UserX,
} from "lucide-react";

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { status } = useAuth();
  const router = useRouter();
  const { config, loading: configLoading } = useAppConfig();

  const [authenticating, setAuthenticating] = useState(false);
  const [unregisteredError, setUnregisteredError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    description: string;
  } | null>(null);

  // If already authenticated and ready, redirect to student dashboard
  useEffect(() => {
    if (status === "loading") return;
    if (status === "ready") {
      router.replace("/student/dashboard");
    } else if (status === "admin") {
      router.replace("/admin");
    }
  }, [status, router]);

  if (status === "loading" || configLoading) return <PageSkeleton />;

  const festName = config?.festName ?? "Euphoria 2026";

  async function handleGoogleLogin() {
    setErrorMessage(null);
    setUnregisteredError(false);
    setAuthenticating(true);

    try {
      const credential = await signInWithGooglePopup();
      const user = credential.user;
      const email = (user.email ?? "").toLowerCase().trim();

      // 1. Verify that email is an official college account
      if (!isValidCollegeEmail(email)) {
        await authSignOut();
        setErrorMessage({
          title: "Personal Account Not Allowed",
          description:
            "Please sign in using your official MSEC college Google account (@msec.edu.in).",
        });
        return;
      }

      // 2. Query student registration status (with resilient server fallback)
      let isRegistered = false;
      try {
        const [studentDocSnap, userDocSnap] = await Promise.all([
          getDoc(doc(db, "students", user.uid)),
          getDoc(doc(db, "users", user.uid)),
        ]);
        if (studentDocSnap.exists() || userDocSnap.exists()) {
          isRegistered = true;
        }
      } catch {
        // Fallback to Server API if client read permissions are restricted
        try {
          const idToken = await user.getIdToken();
          const pRes = await fetch("/api/auth/profile", {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData.exists) isRegistered = true;
          }
        } catch {
          // ignore error
        }
      }

      if (!isRegistered) {
        // User authenticated with Google but has NOT completed registration!
        await authSignOut();
        setUnregisteredError(true);
        return;
      }

      // 3. User is registered! Redirect to Student Dashboard
      router.replace("/student/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        setErrorMessage(null);
      } else {
        setErrorMessage({
          title: "Login Failed",
          description: "Could not authenticate with Google. Please try again.",
        });
      }
    } finally {
      setAuthenticating(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-8"
      style={{ background: "var(--bg)" }}
    >
      <FestBackground />

      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo festName={festName} size="md" />
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold bg-[#FEF0D9] text-[#D48006] border border-[#F2960B]/30">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Cultural Fest 2026</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl text-[#2C1B6B] tracking-wide">
            Welcome Back
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5B5470]">
            Sign in with your registered college Google account.
          </p>
        </div>

        <div
          className="rounded-[24px] p-6 sm:p-8 border shadow-lg"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {errorMessage && (
            <div
              className="mb-6 rounded-2xl p-4 text-xs space-y-1"
              style={{
                background: "var(--error-soft)",
                color: "var(--error)",
                border: "1px solid var(--error)",
              }}
              role="alert"
            >
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMessage.title}</span>
              </div>
              <p className="leading-relaxed opacity-90">{errorMessage.description}</p>
            </div>
          )}

          {unregisteredError ? (
            /* Unregistered User Notice */
            <div className="space-y-6 text-center">
              <div className="rounded-2xl border p-5 text-center bg-amber-50/70 border-amber-200">
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <UserX className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-amber-900">
                  You haven&apos;t registered for the cultural fest yet.
                </h3>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  We couldn&apos;t find a festival profile for this college Google account. Complete your student registration to participate and rate acts on stage.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <Link
                  href="/register"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-sm font-bold text-white shadow-md transition hover:opacity-95"
                  style={{ background: "var(--gradient-hero)", minHeight: "48px" }}
                >
                  <span>Register Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => setUnregisteredError(false)}
                  className="w-full rounded-2xl border py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            /* Standard Google Login Button */
            <div className="space-y-6 text-center">
              <div className="rounded-2xl border p-4 text-left bg-slate-50/70 border-slate-200/80">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600">
                    <p className="font-semibold text-slate-900">
                      Passwordless Student Sign-In
                    </p>
                    <p className="mt-0.5">
                      Use the same official MSEC Google account you used during registration.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={authenticating}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white py-3.5 px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                style={{ minHeight: "52px" }}
              >
                {authenticating ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin text-slate-500" />
                    <span>Signing in with Google…</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="h-5 w-5" />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="h-3 w-3" />
                <span>Protected by Google Authentication</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-bold text-primary hover:underline"
              style={{ color: "var(--primary)" }}
            >
              Register here →
            </Link>
          </p>
          <p className="text-[11px] text-slate-400">
            Fest Administrators:{" "}
            <Link href="/admin/login" className="font-semibold text-purple-700 underline hover:text-purple-800">
              Admin Console
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
