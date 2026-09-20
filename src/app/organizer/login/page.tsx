"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword, getIdTokenResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { loginFormSchema, type LoginFormInput } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { Sliders, Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";

export default function OrganizerLoginPage() {
  const { status } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "admin" || status === "organizer") {
      router.replace("/organizer/dashboard");
    }
  }, [status, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
  });

  if (status === "loading") return <PageSkeleton />;

  async function onSubmit(values: LoginFormInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        values.email.trim(),
        values.password
      );

      // Refresh token to verify staff credentials
      const tokenResult = await getIdTokenResult(credential.user, true);

      if (!tokenResult.claims["organizer"] && !tokenResult.claims["admin"]) {
        await auth.signOut();
        setServerError("This account is not authorized as an event organizer. Please use an organizer account.");
        return;
      }

      router.replace("/organizer/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setServerError("Incorrect organizer email or password.");
      } else {
        setServerError("Unable to sign in right now. Please check your credentials.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-8"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-3 shadow-sm" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#D97706" }}>
            <Sliders className="h-6 w-6" />
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ fontFamily: "var(--font-bricolage)", color: "#B45309" }}
          >
            Organizer Console
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Stage managers, act coordinators &amp; voting timers
          </p>
        </div>

        <div
          className="rounded-[20px] p-6 border shadow-sm"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {serverError && (
            <div
              className="mb-4 rounded-xl p-3 text-xs leading-relaxed"
              style={{
                background: "var(--error-soft)",
                color: "var(--error)",
                border: "1px solid var(--error)",
              }}
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="organizer-email"
                className="text-xs font-semibold text-slate-700"
              >
                Organizer Email
              </label>
              <input
                id="organizer-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="w-full rounded-[12px] border px-3 py-3 text-base outline-none transition focus:ring-2 focus:ring-amber-500/30"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                }}
                placeholder="organizer@msec.edu.in"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs font-medium" style={{ color: "var(--error)" }} role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="organizer-password"
                className="text-xs font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="organizer-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-[12px] border px-3 py-3 pr-10 text-base outline-none transition focus:ring-2 focus:ring-amber-500/30"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                  }}
                  placeholder="Organizer password"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-medium" style={{ color: "var(--error)" }} role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[14px] py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              style={{ background: "#D97706", minHeight: "48px" }}
            >
              {submitting ? "Entering Console…" : "Open Stage Lineup & Timer"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5 text-center text-xs text-slate-500">
            <div>
              Need central administration?{" "}
              <Link href="/admin/login" className="font-semibold text-purple-700 hover:underline inline-flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Administrator Login →
              </Link>
            </div>
            <div>
              <Link href="/" className="hover:underline text-slate-400 inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back to Festival Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
