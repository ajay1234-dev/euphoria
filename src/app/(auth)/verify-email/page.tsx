"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  sendEmailVerification,
  getIdToken,
} from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { userRef } from "@/lib/firebase/paths";
import { useAuth } from "@/hooks/useAuth";
import { FestBackground } from "@/components/common/FestBackground";
import { Logo } from "@/components/common/Logo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { Mail, CheckCircle, RefreshCw } from "lucide-react";
import {
  RESEND_COOLDOWN_SECONDS,
  VERIFY_EMAIL_POLL_INTERVAL_MS,
  VERIFY_EMAIL_POLL_MAX_MS,
} from "@/config/constants";
import { setDoc } from "firebase/firestore";

export default function VerifyEmailPage() {
  const { status, user, config, refreshAuth } = useAuth();
  const router = useRouter();

  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  // If already verified, redirect
  useEffect(() => {
    if (status === "ready") {
      router.replace("/vote");
    } else if (status === "signed-out") {
      router.replace("/login");
    } else if (status === "admin") {
      router.replace("/admin");
    }
  }, [status, router]);

  const checkVerification = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    try {
      await user.reload();
      // Force token refresh to pick up email_verified
      await getIdToken(user, true);

      if (user.emailVerified) {
        // Write to Firestore profile
        try {
          await setDoc(
            userRef(user.uid),
            { emailVerified: true, verifiedAt: serverTimestamp() },
            { merge: true }
          );
        } catch {
          // Rules will validate; if already verified this is fine
        }
        await refreshAuth();
        router.replace("/vote");
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }, [user, refreshAuth, router]);

  // 5-second poll while tab is visible, stops after 5 minutes
  useEffect(() => {
    if (status !== "unverified") return;

    function startPoll() {
      pollStartRef.current = Date.now();
      pollRef.current = setInterval(() => {
        if (!document.hidden) {
          const elapsed = Date.now() - pollStartRef.current;
          if (elapsed > VERIFY_EMAIL_POLL_MAX_MS) {
            clearInterval(pollRef.current!);
            return;
          }
          checkVerification();
        }
      }, VERIFY_EMAIL_POLL_INTERVAL_MS);
    }

    startPoll();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, checkVerification]);

  // Re-check on tab focus (visibility change)
  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden) checkVerification();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [checkVerification]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!user || cooldown > 0) return;
    setResendLoading(true);
    setMessage(null);
    try {
      await sendEmailVerification(user, {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage("Verification email sent! Check your inbox and spam folder.");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/too-many-requests") {
        setMessage("Too many requests. Please wait a few minutes before requesting another email.");
      } else {
        setMessage("Failed to send email. Please try again.");
      }
    } finally {
      setResendLoading(false);
    }
  }

  if (status === "loading") return <PageSkeleton />;
  if (status === "ready") return null; // redirect in progress

  const email = user?.email ?? "";

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-8"
      style={{ background: "var(--bg)" }}
    >
      <FestBackground />
      <div className="w-full max-w-md text-center">
        <Logo festName={config?.festName ?? "Euphoria"} size="md" className="mb-4" />

        <div
          className="rounded-[20px] p-8"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "var(--primary-soft)" }}
            aria-hidden="true"
          >
            <Mail className="h-8 w-8" style={{ color: "var(--primary)" }} />
          </div>

          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--ink)" }}>
            Check your inbox
          </h1>
          <p className="text-sm mb-1" style={{ color: "var(--ink-muted)" }}>
            We sent a verification email to:
          </p>
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--ink)" }}>
            {email}
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
            Click the link in the email to verify your account. Check your spam
            folder if you don&apos;t see it.
          </p>

          {message && (
            <div
              className="mb-4 rounded-xl p-3 text-sm text-center"
              style={{
                background: message.includes("sent") ? "var(--success-soft)" : "var(--warning-soft)",
                color: message.includes("sent") ? "var(--success)" : "var(--warning)",
              }}
              role="status"
            >
              {message}
            </div>
          )}

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            className="mb-3 w-full rounded-[14px] border py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{
              borderColor: "var(--border)",
              color: "var(--primary)",
              background: "var(--surface)",
              minHeight: "48px",
            }}
          >
            {resendLoading
              ? "Sending…"
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend verification email"}
          </button>

          {/* I've verified */}
          <button
            onClick={checkVerification}
            disabled={checking}
            className="w-full rounded-[14px] py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-70"
            style={{ background: "var(--gradient-hero)", minHeight: "48px" }}
          >
            {checking ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                I&apos;ve verified — continue
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => auth.signOut()}
          className="mt-4 text-sm"
          style={{ color: "var(--ink-muted)" }}
        >
          Use a different account? Sign out
        </button>
      </div>
    </div>
  );
}
