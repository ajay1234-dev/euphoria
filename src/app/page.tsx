"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FestBackground } from "@/components/common/FestBackground";
import { Logo } from "@/components/common/Logo";
import { Confetti } from "@/components/common/Confetti";
import {
  Trophy,
  Shield,
  Tv,
  Radio,
  Lock,
  UserCheck,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const STEPS = [
  {
    step: "1",
    badge: "Official Verification",
    icon: <UserCheck className="h-6 w-6 text-[#2C1B6B]" />,
    title: "Official College Sign-in",
    description:
      "Sign in securely with your @msec.edu.in or @student.msec.edu.in account. Your department, section, and 12-digit register number are verified automatically.",
  },
  {
    step: "2",
    badge: "Live Stage Arena",
    icon: <Radio className="h-6 w-6 text-[#F2960B]" />,
    title: "Live Stage Countdown",
    description:
      "As each act performs, the live rating window opens directly on your phone with a synchronized stage timer. Keep your screen open during the performance.",
  },
  {
    step: "3",
    badge: "People's Choice Rating",
    icon: <Trophy className="h-6 w-6 text-[#146C43]" />,
    title: "Rate 1 to 5 Stars",
    description:
      "Submit your rating from 1 to 5 stars before the stage countdown finishes. Every student gets exactly one verified rating to decide the People's Choice champion.",
  },
];

export default function LandingPage() {
  const { status, config, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "ready") router.replace("/vote");
    if (status === "admin") router.replace("/admin");
  }, [status, router]);

  const festName = config?.festName ?? "Euphoria 2026";

  return (
    <div
      className="min-h-dvh flex flex-col selection:bg-amber-100 selection:text-[#1C1533]"
      style={{ background: "var(--color-base)" }}
    >
      <FestBackground />
      <Confetti duration={4500} />

      {/* Top Navigation Bar */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl transition-all"
        style={{
          background: "rgba(255, 251, 243, 0.92)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Logo festName={festName} size="md" />
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F1E8FF] px-2.5 py-0.5 text-xs font-semibold text-[#2C1B6B]">
              <span className="h-2 w-2 rounded-full bg-[#D6266E] animate-pulse" />
              <span>Live on Stage</span>
            </div>
          </div>

          {/* Quick Nav Links */}
          <nav className="flex items-center gap-2 sm:gap-3 shrink-0" aria-label="Main Navigation">
            <Link
              href="/admin/login"
              className="tap-scale inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition hover:bg-[#FBF1E0]"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-ink)",
                background: "var(--color-surface)",
                minHeight: "40px",
              }}
              title="Admin Console"
            >
              <Shield className="h-4 w-4 text-[#2C1B6B] shrink-0" />
              <span>Admin</span>
            </Link>

            {user ? (
              <Link
                href={status === "admin" ? "/admin" : "/student/dashboard"}
                className="tap-scale inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:opacity-95"
                style={{ background: "var(--color-secondary)", minHeight: "40px" }}
              >
                <span>Festival Portal</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="tap-scale rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#1C1533] transition hover:bg-[#FBF1E0]"
                  style={{ minHeight: "40px", display: "inline-flex", alignItems: "center" }}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="tap-scale rounded-2xl px-4 py-2 text-xs sm:text-sm font-bold text-[#1C1533] shadow-xs transition hover:bg-[#D48006]"
                  style={{ background: "var(--color-primary)", minHeight: "40px", display: "inline-flex", alignItems: "center" }}
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section — Poster Concept (Section 3) */}
      <section
        className="relative flex flex-col items-center justify-center px-4 pt-12 pb-14 sm:pt-16 sm:pb-20 text-center overflow-hidden border-b"
        style={{
          background: "linear-gradient(180deg, #FFFBF3 0%, #FBF1E0 100%)",
          borderColor: "var(--color-border)",
        }}
        aria-label="Festival Poster Hero"
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center space-y-5">
          {/* Institution Header Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F0E4CE] bg-white px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#5B5470] shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-[#F2960B]" />
            <span>Meenakshi Sundararajan Engineering College, Chennai</span>
          </div>

          {/* Marquee Anton Wordmark */}
          <div className="py-2">
            <h1
              className="text-6xl xs:text-7xl sm:text-8xl md:text-9xl font-black uppercase tracking-tight text-[#1C1533] leading-none"
              style={{ fontFamily: "var(--font-anton), sans-serif" }}
            >
              {festName}
            </h1>
          </div>

          {/* One-Line Descriptive Tagline */}
          <p className="text-lg sm:text-xl font-medium text-[#5B5470] max-w-xl mx-auto leading-relaxed">
            Annual College Cultural Fest · Official People&apos;s Choice Live Rating
          </p>

          {/* Call-to-Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md mx-auto">
            <Link
              href="/register"
              className="tap-scale inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-7 text-base font-bold shadow-xs transition hover:bg-[#D48006]"
              style={{
                background: "var(--color-primary)",
                color: "#1C1533",
                minHeight: "52px",
              }}
            >
              <UserCheck className="h-5 w-5 shrink-0" />
              <span>Register to Rate Acts</span>
            </Link>

            <Link
              href="/login"
              className="tap-scale inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border bg-white px-7 text-base font-semibold text-[#1C1533] shadow-xs transition hover:bg-[#FBF1E0]"
              style={{
                borderColor: "var(--color-border)",
                minHeight: "52px",
              }}
            >
              <span>Student Sign-in</span>
            </Link>
          </div>

          {/* Genuine Fest Fact Banner */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-[#2C1B6B]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F1E8FF] px-3.5 py-1">
              <span className="h-2 w-2 rounded-full bg-[#146C43]" />
              <span>7 Engineering Departments · Live on Stage Tonight</span>
            </span>
          </div>

          {/* Official Email Requirement Notice */}
          <p className="text-xs text-[#5B5470] flex items-center justify-center gap-1.5 pt-1">
            <Lock className="h-3.5 w-3.5 shrink-0 text-[#F2960B]" />
            <span>Sign in with your official @msec.edu.in or @student.msec.edu.in account</span>
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full space-y-12">
        {/* Ordered Onboarding Sequence */}
        <section aria-labelledby="steps-heading" className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2
              id="steps-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1533]"
            >
              How People&apos;s Choice Rating Works
            </h2>
            <p className="text-sm text-[#5B5470]">
              Zero paper tokens. Verified student star ratings tallied on stage in real time.
            </p>
          </div>

          <ol className="grid gap-6 sm:grid-cols-3" role="list">
            {STEPS.map((s, idx) => (
              <li
                key={idx}
                className="relative flex flex-col justify-between rounded-xl p-6 border bg-white shadow-xs transition-colors hover:border-[#D48006]"
                style={{
                  borderColor: "var(--color-border)",
                  borderRadius: "var(--radius-card)",
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF1E0] border border-[#F0E4CE]">
                      {s.icon}
                    </div>
                    <span
                      className="text-2xl font-black text-[#5B5470]/30 tabular-nums"
                      style={{ fontFamily: "var(--font-anton), sans-serif" }}
                    >
                      0{s.step}
                    </span>
                  </div>

                  <span className="inline-block text-xs font-bold text-[#F2960B]">
                    {s.badge}
                  </span>

                  <h3 className="text-lg font-bold text-[#1C1533]">
                    {s.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-[#5B5470]">
                    {s.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#F0E4CE] flex items-center gap-1.5 text-xs font-semibold text-[#146C43]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Verified stage procedure</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Stage Administration & Auditorium Projector Display Hub */}
        <section
          className="rounded-xl p-6 sm:p-8 border flex flex-col md:flex-row items-center justify-between gap-6"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[#2C1B6B] bg-[#F1E8FF] border border-[#DDD6FE]">
              <CalendarCheck className="h-4 w-4" />
              <span>Stage &amp; Auditorium Displays</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1C1533]">
              Auditorium Screens &amp; Admin Controller
            </h3>
            <p className="text-sm text-[#5B5470] leading-relaxed">
              Launch live countdown timers on the confidence monitor, reveal category winner podiums on the LED wall, and control act transitions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href="/projector/timer"
              target="_blank"
              rel="noopener noreferrer"
              className="tap-scale flex items-center justify-center gap-2 rounded-2xl border bg-white px-5 py-3 text-sm font-semibold text-[#1C1533] shadow-xs transition hover:bg-[#FBF1E0]"
              style={{ borderColor: "var(--color-border)", minHeight: "48px" }}
            >
              <Tv className="h-4 w-4 text-[#F2960B] shrink-0" />
              <span>Timer Projector ↗</span>
            </Link>

            <Link
              href="/admin/login"
              className="tap-scale flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:opacity-95"
              style={{ background: "var(--color-secondary)", minHeight: "48px" }}
            >
              <Shield className="h-4 w-4 text-white shrink-0" />
              <span>Admin Console</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="mt-auto border-t py-8 text-xs sm:text-sm"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-ink-muted)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="font-semibold text-[#1C1533]">
              © 2026 {festName} · Meenakshi Sundararajan Engineering College
            </p>
            <p className="text-xs text-[#5B5470] mt-1">
              Kodambakkam, Chennai · Autonomous Institution affiliated to Anna University
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm font-medium">
            <Link href="/register" className="hover:text-[#F2960B] transition-colors">
              Student Register
            </Link>
            <span className="text-[#F0E4CE]">·</span>
            <Link href="/login" className="hover:text-[#F2960B] transition-colors">
              Student Sign-in
            </Link>
            <span className="text-[#F0E4CE]">·</span>
            <Link href="/admin/login" className="font-bold text-[#2C1B6B] hover:underline">
              Administrator Console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
