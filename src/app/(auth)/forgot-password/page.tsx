"use client";

import Link from "next/link";
import { FestBackground } from "@/components/common/FestBackground";
import { Logo } from "@/components/common/Logo";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const { config } = useAuth();
  const festName = config?.festName ?? "Euphoria 2026";

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-8"
      style={{ background: "var(--bg)" }}
    >
      <FestBackground />
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo festName={festName} size="md" />
          <h1 className="mt-3 text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Password Reset
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Student accounts authenticate via Google Sign-In
          </p>
        </div>

        <div
          className="rounded-[24px] p-6 sm:p-8 border shadow-lg space-y-5 text-center"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-200">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">
              No Passwords Required
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Student accounts for {festName} authenticate exclusively using official MSEC Google Accounts (@msec.edu.in). You do not need a password to log in.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-sm font-bold text-white shadow-md transition hover:opacity-95"
            style={{ background: "var(--gradient-hero)", minHeight: "48px" }}
          >
            <span>Continue to Student Login</span>
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          <Link href="/login" className="inline-flex items-center gap-1 font-semibold hover:underline">
            <ArrowLeft className="h-3 w-3" /> Back to Student Login
          </Link>
        </p>
      </div>
    </div>
  );
}
