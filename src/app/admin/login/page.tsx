"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmailAndPassword, getIdTokenResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { loginFormSchema, type LoginFormInput } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const { status } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "admin") router.replace("/admin");
  }, [status, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInput>({
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

      // Force token refresh to pick up freshly-granted admin claim
      const tokenResult = await getIdTokenResult(credential.user, true);

      if (!tokenResult.claims["admin"]) {
        await auth.signOut();
        setServerError("This account does not have admin access.");
        return;
      }

      router.replace("/admin");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setServerError("Incorrect email or password.");
      } else {
        setServerError("Something went wrong. Please try again.");
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
          <h1 className="font-heading text-3xl tracking-wide uppercase text-[#2C1B6B]">
            Administrator Login
          </h1>
          <p className="mt-1 text-sm text-[#5B5470]">
            Central management console for fest administrators
          </p>
        </div>

        <div
          className="rounded-[20px] p-6"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          {serverError && (
            <div
              className="mb-4 rounded-xl p-3 text-sm"
              style={{ background: "var(--error-soft)", color: "var(--error)", border: "1px solid var(--error)" }}
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                Admin email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="w-full rounded-[12px] border px-3 py-3 text-base outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)" }}
                placeholder="admin@example.com"
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
              <label htmlFor="password" className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-[12px] border px-3 py-3 pr-10 text-base outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)" }}
                  placeholder="Your password"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ color: "var(--ink-muted)" }}
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
              className="w-full rounded-[14px] py-3.5 text-base font-semibold text-white transition-opacity disabled:opacity-70 cursor-pointer"
              style={{ background: "var(--primary)", minHeight: "48px" }}
            >
              {submitting ? "Logging in…" : "Log in to Admin Panel"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2.5 text-center text-xs text-slate-500">
            <div>
              Looking for stage countdown?{" "}
              <Link href="/projector/timer" className="font-semibold text-amber-700 hover:underline">
                Timer Projector →
              </Link>
            </div>
            <div>
              <Link href="/" className="hover:underline text-slate-400">
                ← Back to Festival Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
