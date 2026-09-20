"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FestBackground } from "@/components/common/FestBackground";
import { Pennants } from "@/components/common/Pennants";
import { Logo } from "@/components/common/Logo";
import { Confetti } from "@/components/common/Confetti";
import GradientWaves from "@/components/common/GradientWaves";
import {
  Star,
  Trophy,
  Shield,
  Sliders,
  Sparkles,
  ArrowRight,
  Radio,
  Lock,
  UserCheck,
  CalendarCheck,
  CheckCircle2,
  Zap,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    step: "01",
    badge: "Student Verification",
    icon: <UserCheck className="h-6 w-6 text-purple-600" />,
    iconBg: "bg-purple-50 border-purple-100",
    title: "Instant Google Verification",
    description:
      "Sign in securely with your official college Google email. Your 12-digit register number and engineering department are automatically verified in one tap.",
  },
  {
    step: "02",
    badge: "Stage Live Stream",
    icon: <Radio className="h-6 w-6 text-amber-600" />,
    iconBg: "bg-amber-50 border-amber-100",
    title: "Real-Time Live Stage Window",
    description:
      "As each stage act performs, the countdown clock begins. The voting arena opens instantly on your mobile screen for audience rating.",
  },
  {
    step: "03",
    badge: "Audience Choice",
    icon: <Trophy className="h-6 w-6 text-emerald-600" />,
    iconBg: "bg-emerald-50 border-emerald-100",
    title: "Star Ratings & Tally",
    description:
      "Submit your 1 to 5 star rating. Cryptographic Firebase rules guarantee one tamper-proof vote per student to crown the authentic People's Choice Champion.",
  },
];

export default function LandingPage() {
  const { status, config, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "ready") router.replace("/vote");
    if (status === "admin") router.replace("/admin");
    if (status === "organizer") router.replace("/organizer/dashboard");
  }, [status, router]);

  const festName = config?.festName ?? "Euphoria 2026";

  return (
    <div className="min-h-dvh flex flex-col selection:bg-purple-200 selection:text-purple-900" style={{ background: "var(--bg)" }}>
      <FestBackground />
      <Confetti duration={4500} />

      {/* Top Navigation Bar — Ultra-Responsive */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl transition-all"
        style={{
          background: "rgba(255, 255, 255, 0.90)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Logo festName={festName} size="sm" />
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Fest Arena
            </div>
          </div>

          {/* Quick Nav Links */}
          <nav className="flex items-center gap-1.5 sm:gap-2.5 shrink-0" aria-label="Main Navigation">
            <Link
              href="/organizer/login"
              className="tap-scale inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2.5 sm:px-3 py-2 text-xs font-bold transition hover:bg-amber-50/70 hover:border-amber-200"
              style={{
                borderColor: "var(--border)",
                color: "#B45309",
                background: "var(--surface)",
                minHeight: "40px",
              }}
              title="Organizer Console"
            >
              <Sliders className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 shrink-0" />
              <span className="hidden xs:inline">Organizer</span>
            </Link>

            <Link
              href="/admin/login"
              className="tap-scale inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2.5 sm:px-3 py-2 text-xs font-bold transition hover:bg-purple-50/70 hover:border-purple-200"
              style={{
                borderColor: "var(--border)",
                color: "#6B21A8",
                background: "var(--surface)",
                minHeight: "40px",
              }}
              title="Admin Console"
            >
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 shrink-0" />
              <span className="hidden xs:inline">Admin</span>
            </Link>

            {user ? (
              <Link
                href={status === "admin" ? "/admin" : status === "organizer" ? "/organizer/dashboard" : "/student/dashboard"}
                className="tap-scale inline-flex items-center gap-1 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:opacity-95"
                style={{ background: "var(--gradient-hero)", minHeight: "40px" }}
              >
                <span>Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Link
                  href="/login"
                  className="tap-scale rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                  style={{ minHeight: "40px", display: "inline-flex", alignItems: "center" }}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="tap-scale rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:opacity-95"
                  style={{ background: "var(--gradient-hero)", minHeight: "40px", display: "inline-flex", alignItems: "center" }}
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section — Crafted Festival Atmosphere */}
      <section
        className="relative flex flex-col items-center overflow-hidden px-4 pb-10 sm:pb-14 pt-8 sm:pt-12 text-center"
        style={{ background: "var(--gradient-hero)" }}
        aria-label="Festival Hero"
      >
        {/* Dynamic 3D WebGL GradientWaves from React Bits */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60 z-0">
          <GradientWaves
            horizonColor="#1E1B4B"
            waveColor="#7C3AED"
            crestColor="#F472B6"
            speed={0.35}
            amplitude={2.2}
            waveScale={0.65}
            waveRatio={0.85}
            swell={30}
            turbulence={18}
            tilt={1.15}
            zoom={1.05}
            height={5.2}
            fogDepth={18}
            detail="low"
            brightness={1.0}
            opacity={0.85}
            mouseInteraction={true}
            parallaxStrength={0.4}
            grain={true}
            grainIntensity={0.035}
          />
        </div>

        <Pennants className="absolute top-0 left-0 right-0 h-10 sm:h-14 w-full opacity-90 pointer-events-none z-10" />

        {/* Ambient backdrop glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25 z-0"
          style={{
            background: "radial-gradient(circle at 50% 30%, rgba(254, 240, 138, 0.2) 0%, transparent 60%)",
          }}
        />

        {/* Decorative Festive Sparkle Tag */}
        <div className="relative z-10 mb-3 sm:mb-4 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-white backdrop-blur-md shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-spin-slow" />
          <span className="tracking-wide uppercase">Meenakshi Sundararajan Engineering College</span>
        </div>

        {/* Festival Title — Instant High-Performance Gradient Text */}
        <div className="relative z-10 w-full max-w-4xl px-2 flex flex-col items-center">
          <h1
            className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-pink-200 drop-shadow-md py-2 leading-[1.08] text-center"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {festName}
          </h1>

          <p className="mt-1 sm:mt-2 text-base sm:text-lg md:text-xl font-medium text-white/95 leading-relaxed max-w-2xl mx-auto drop-shadow-xs">
            The Official People&apos;s Choice Performance Rating App.
            Every student gets one verified live vote to crown the champion act.
          </p>
        </div>

        {/* Key Festival Pillars / Stat Badges — Instant 0ms display */}
        <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-2.5 max-w-2xl text-xs sm:text-sm font-semibold text-white/95">
          <span className="glass-pill rounded-full px-3.5 py-1.5 flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Verified MSEC Students</span>
          </span>
          <span className="glass-pill rounded-full px-3.5 py-1.5 flex items-center gap-1.5 shadow-xs">
            <Zap className="h-4 w-4 text-amber-300 shrink-0" />
            <span>Instant Live Star Rating</span>
          </span>
          <span className="glass-pill rounded-full px-3.5 py-1.5 flex items-center gap-1.5 shadow-xs">
            <Lock className="h-4 w-4 text-purple-200 shrink-0" />
            <span>Single Cryptographic Vote</span>
          </span>
        </div>

        {/* Hero Call-to-Action Buttons — 100% Mobile Responsive & Instantly Visible */}
        <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-xl mx-auto px-2">
          <Link
            href="/register"
            className="tap-scale inline-flex h-13 items-center justify-center gap-2.5 rounded-2xl bg-white px-7 sm:px-8 text-sm sm:text-base font-extrabold shadow-xl transition-all hover:bg-slate-50 hover:shadow-2xl whitespace-nowrap w-full sm:w-auto"
            style={{ color: "var(--primary)" }}
          >
            <UserCheck className="h-5 w-5 text-purple-600 shrink-0" />
            <span className="whitespace-nowrap">Register Student Account</span>
          </Link>

          <Link
            href="/login"
            className="tap-scale inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/20 px-7 sm:px-8 text-sm sm:text-base font-bold text-white shadow-md backdrop-blur-md transition-all hover:bg-white/30 whitespace-nowrap w-full sm:w-auto"
          >
            <span className="whitespace-nowrap">Student Log In</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>

        {/* Official College Email Notice */}
        <p className="relative z-10 mt-5 text-xs sm:text-sm text-white/90 flex items-center justify-center gap-1.5 px-4 font-medium">
          <Lock className="h-4 w-4 shrink-0 text-amber-300" />
          <span>Official <strong className="underline underline-offset-2">@student.msec.edu.in</strong> or <strong className="underline underline-offset-2">@msec.edu.in</strong> Google sign-in required</span>
        </p>
      </section>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full space-y-14 sm:space-y-18">
        
        {/* How It Works 3-Step Guide */}
        <section aria-labelledby="how-heading" className="space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Transparent &amp; Tamper-Proof</span>
            </div>
            <h2
              id="how-heading"
              className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900"
            >
              How People&apos;s Choice Voting Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Zero paper ballots. 100% verified student star ratings tallied in real time.
            </p>
          </div>

          <ol className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {HOW_IT_WORKS.map((step, i) => (
              <li
                key={i}
                className="relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 border bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
                style={{
                  borderColor: "var(--border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xs transition-transform group-hover:scale-105 ${step.iconBg}`}
                    >
                      {step.icon}
                    </div>
                    <span className="font-display font-black text-2xl sm:text-3xl text-slate-200 group-hover:text-purple-200 transition-colors tabular-nums">
                      {step.step}
                    </span>
                  </div>

                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
                    {step.badge}
                  </span>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1.5 mb-2">
                    {step.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-purple-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Verified step {i + 1} of 3</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Quick Admin & Organizer Links Banner */}
        <section
          className="rounded-3xl p-6 sm:p-8 border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
          style={{
            background: "linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)",
            borderColor: "rgba(245, 158, 11, 0.2)",
            boxShadow: "0 4px 20px -2px rgba(245, 158, 11, 0.12)",
          }}
        >
          {/* Accent top ribbon */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-purple-500 to-amber-500" />

          <div className="space-y-2 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-bold text-amber-800 bg-amber-100">
              <CalendarCheck className="h-4 w-4 text-amber-600" />
              <span>Event Coordinator &amp; Staff Console</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Need to coordinate live acts or configure event settings?
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Authorized stage managers and fest administrators have dedicated consoles for timing countdowns, categories, and student voter directories.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href="/organizer/login"
              className="tap-scale flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-5 py-3 text-sm font-bold text-amber-800 hover:bg-amber-50 shadow-xs transition"
              style={{ minHeight: "48px" }}
            >
              <Sliders className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Organizer Sign-In</span>
            </Link>
            <Link
              href="/admin/login"
              className="tap-scale flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm hover:opacity-95 transition"
              style={{ background: "var(--gradient-hero)", minHeight: "48px" }}
            >
              <Shield className="h-4 w-4 text-white shrink-0" />
              <span>Admin Login →</span>
            </Link>
          </div>
        </section>

      </main>

      {/* Footer — Clean, Accessible, Responsive */}
      <footer
        className="mt-auto border-t py-8 text-xs sm:text-sm"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          color: "var(--ink-muted)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="font-semibold text-slate-800 text-sm">
              © 2026 <strong>{festName}</strong> · Meenakshi Sundararajan Engineering College
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Kodambakkam, Chennai · Autonomous Institution affiliated to Anna University
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm">
            <Link href="/register" className="hover:text-primary transition-colors font-medium">
              Student Register
            </Link>
            <span className="text-slate-300">·</span>
            <Link href="/login" className="hover:text-primary transition-colors font-medium">
              Student Login
            </Link>
            <span className="text-slate-300">·</span>
            <Link href="/organizer/login" className="hover:text-primary font-bold text-amber-700 transition-colors">
              Stage Organizer
            </Link>
            <span className="text-slate-300">·</span>
            <Link href="/admin/login" className="font-bold text-purple-700 hover:text-purple-900 transition-colors">
              Administrator
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
