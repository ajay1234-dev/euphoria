"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { FestBackground } from "@/components/common/FestBackground";
import { Pennants } from "@/components/common/Pennants";
import { Logo } from "@/components/common/Logo";
import {
  CheckCircle,
  Star,
  Trophy,
  Shield,
  Sliders,
  Sparkles,
  ArrowRight,
  Radio,
  Lock,
  CalendarCheck,
  ChevronRight,
  UserCheck,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    icon: <UserCheck className="h-6 w-6" />,
    title: "Register with College Register No.",
    description:
      "Enter your official college email (e.g. 311523205004@student.msec.edu.in). Your department is auto-verified securely from your college register number.",
  },
  {
    icon: <Radio className="h-6 w-6" />,
    title: "Watch Acts Live on Stage",
    description:
      "When an act begins, voting opens in real time on your phone for a designated duration set by stage organizers.",
  },
  {
    icon: <Trophy className="h-6 w-6" />,
    title: "Live Star Rating & Crown Winners",
    description:
      "Rate 1–5 stars. Tamper-proof Firebase rules tally verified student votes to determine the People's Choice Champion.",
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
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <FestBackground />

      {/* Top Navigation Bar */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors"
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo festName={festName} size="sm" />
            <div className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              People&apos;s Choice Fest
            </div>
          </div>

          {/* Quick Nav Links */}
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main Navigation">
            <Link
              href="/vote"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition hover:bg-slate-100"
              style={{ color: "var(--ink)" }}
            >
              <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
              <span className="hidden xs:inline">Live</span> Voting
            </Link>

            <Link
              href="/organizer/login"
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-semibold transition hover:bg-slate-50"
              style={{
                borderColor: "var(--border)",
                color: "var(--ink)",
                background: "var(--surface)",
              }}
              title="Organizer Console"
            >
              <Sliders className="h-4 w-4 text-amber-600" />
              <span>Organizer</span>
            </Link>

            {user ? (
              <Link
                href={status === "admin" ? "/admin" : "/vote"}
                className="inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                style={{ background: "var(--gradient-hero)" }}
              >
                Go to Portal <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition hover:bg-slate-100"
                  style={{ color: "var(--ink)" }}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                  style={{ background: "var(--gradient-hero)" }}
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative flex flex-col items-center overflow-hidden px-4 pb-20 pt-14 text-center"
        style={{ background: "var(--gradient-hero)" }}
        aria-label="Festival Hero"
      >
        <Pennants className="absolute top-0 left-0 right-0 h-12 w-full opacity-90" />

        {/* Decorative Festive Sparkle Tag */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs sm:text-sm font-medium text-white backdrop-blur-md shadow-sm"
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>Inter-Department Cultural Fest 2026</span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <h1
            className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl drop-shadow-sm"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            {festName}
          </h1>
          <p className="mt-4 text-base font-medium text-white/90 sm:text-xl sm:leading-relaxed max-w-xl mx-auto">
            The Official People&apos;s Choice Performance Rating App.
            Every student gets one verified vote for each live performance.
          </p>
        </motion.div>

        {/* Hero Call-to-Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-8 text-base font-bold shadow-lg transition-transform active:scale-95 hover:bg-slate-50"
            style={{ color: "var(--primary)" }}
          >
            <UserCheck className="h-5 w-5" />
            Register Student Account
          </Link>

          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/20 px-8 text-base font-bold text-white shadow-md backdrop-blur-md transition-transform active:scale-95 hover:bg-white/30"
          >
            Student Log In
          </Link>

          <Link
            href="/organizer/login"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/20 px-5 text-sm font-semibold text-white/95 backdrop-blur-md transition-transform active:scale-95 hover:bg-black/30"
          >
            <Sliders className="h-4 w-4 text-amber-300" />
            Organizer Console
          </Link>
        </motion.div>

        {/* College Email Notice */}
        <p className="mt-5 text-xs text-white/75 flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          <span>Official <strong>@student.msec.edu.in</strong> or <strong>@msec.edu.in</strong> accounts required</span>
        </p>
      </section>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full space-y-16">
        
        {/* Portal Access Cards for Roles */}
        <section aria-labelledby="portals-heading">
          <div className="text-center mb-8">
            <h2
              id="portals-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              Choose Your Festival Portal
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Dedicated workflows for audience voters, stage managers, and event admins
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {/* Student Card */}
            <div
              className="relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 border transition hover:shadow-lg"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl mb-4"
                  style={{ background: "rgba(124, 58, 237, 0.1)", color: "#7C3AED" }}
                >
                  <Star className="h-6 w-6 fill-purple-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  Student Audience
                </span>
                <h3 className="text-xl font-bold mt-1 text-slate-900">
                  Student Portal
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Register with your official college Google account. Your department is verified instantly. Rate each live stage act.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Auto-detects department from college email</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Realtime 1–5 star rating slider</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Guaranteed single vote per verified student</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-slate-100">
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
                  style={{ background: "var(--gradient-hero)" }}
                >
                  Create Student Account <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-xl border py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  style={{ borderColor: "var(--border)" }}
                >
                  Already Registered? Log In
                </Link>
              </div>
            </div>

            {/* Organizer Card */}
            <div
              className="relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 border transition hover:shadow-lg"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl mb-4"
                  style={{ background: "rgba(245, 158, 11, 0.12)", color: "#D97706" }}
                >
                  <Sliders className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Stage Managers &amp; Coordinators
                </span>
                <h3 className="text-xl font-bold mt-1 text-slate-900">
                  Organizer Console
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Stage coordinators and event leads control act sequencing, trigger the live voting countdown clock, and monitor incoming submission tallies.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Live lineup &amp; performance timeline</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>One-tap timer trigger (30s, 60s, 120s)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Live status monitor &amp; safety lock</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 flex flex-col gap-2 pt-4 border-t border-slate-100">
                <Link
                  href="/organizer/login"
                  className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
                  style={{ background: "#D97706" }}
                >
                  Enter Organizer Console <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/admin/performances"
                  className="flex items-center justify-center rounded-xl border py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  style={{ borderColor: "var(--border)" }}
                >
                  View Performance Lineup
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works 3-Step Guide */}
        <section aria-labelledby="how-heading">
          <div className="text-center mb-8">
            <h2
              id="how-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
            >
              How People&apos;s Choice Voting Works
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Zero paper ballots. 100% transparent live student votes.
            </p>
          </div>

          <ol className="grid gap-6 sm:grid-cols-3" role="list">
            {HOW_IT_WORKS.map((step, i) => (
              <li
                key={i}
                className="relative flex flex-col rounded-3xl p-6 border transition hover:shadow-md"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                  >
                    {step.icon}
                  </div>
                  <span className="font-mono text-2xl font-black text-slate-200">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Quick Admin & Organizer Links Banner */}
        <section className="rounded-3xl p-6 sm:p-8 border flex flex-col sm:flex-row items-center justify-between gap-6" style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}>
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <span>Event Coordinator &amp; Staff Access</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Need to coordinate acts or manage event settings?
            </h3>
            <p className="text-xs text-slate-600 max-w-lg">
              Staff with approved organizer or administrator claims can access stage controls, category weights, and live rating tally boards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/organizer/login"
              className="rounded-xl border px-4 py-2.5 text-xs font-bold text-amber-800 bg-white hover:bg-amber-50 shadow-sm transition"
              style={{ borderColor: "var(--border)" }}
            >
              Organizer Sign-In
            </Link>
            <Link
              href="/admin/login"
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition"
              style={{ background: "var(--gradient-hero)" }}
            >
              Admin Login →
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer
        className="mt-auto border-t py-8 text-center text-xs"
        style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-muted)" }}
      >
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600">
            © 2026 <strong>{festName}</strong> · Meenakshi Sundararajan Engineering College (MSEC)
          </p>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/register" className="hover:text-primary transition-colors">
              Student Register
            </Link>
            <span>·</span>
            <Link href="/login" className="hover:text-primary transition-colors">
              Student Login
            </Link>
            <span>·</span>
            <Link href="/vote" className="hover:text-primary transition-colors">
              Live Voting
            </Link>
            <span>·</span>
            <Link href="/organizer/login" className="hover:text-primary font-medium text-amber-800 transition-colors">
              Organizer Console
            </Link>
            <span>·</span>
            <Link href="/admin/login" className="font-semibold text-slate-800 hover:text-primary transition-colors">
              Admin Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
