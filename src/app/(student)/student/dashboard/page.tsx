"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useActiveEvent, useDepartments, useCategories, usePerformances } from "@/hooks/useData";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DepartmentChip } from "@/components/common/DepartmentChip";
import { EmptyState } from "@/components/common/EmptyState";
import { FestBackground } from "@/components/common/FestBackground";
import { formatYearLabel } from "@/config/departments";
import {
  User,
  Star,
  LogOut,
  Sparkles,
  CheckCircle2,
  Calendar,
  Building2,
  Hash,
  Layers,
  ArrowRight,
  Music,
} from "lucide-react";

function StudentDashboardContent() {
  const { studentProfile, profile, config, signOutUser } = useAuth();
  const { event } = useActiveEvent(config?.activeEventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();
  const { performances, loading: perfsLoading } = usePerformances(config?.activeEventId);

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Pull fields from studentProfile or fallback to profile
  const name = studentProfile?.name || profile?.fullName || profile?.name || "Student";
  const registerNumber = studentProfile?.registerNumber || profile?.registerNumber || profile?.studentId || "—";
  const year = studentProfile?.year || profile?.year || 1;
  const departmentName = studentProfile?.department || profile?.department || "General";
  const section = studentProfile?.section || profile?.section || "A";
  const email = studentProfile?.email || profile?.email || "—";

  const festName = config?.festName ?? "Euphoria 2026";

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <FestBackground />

      {/* Top Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b backdrop-blur-md bg-white/90"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage)", color: "var(--primary)" }}
          >
            {festName}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700">
            <Sparkles className="h-3 w-3" />
            Student Portal
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/vote"
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-95"
            style={{ background: "var(--gradient-hero)" }}
          >
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            <span>Live Voting</span>
          </Link>

          <button
            onClick={signOutUser}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
        {/* Welcome Greeting */}
        <div className="space-y-1">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            Welcome, {name} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Here is your verified festival registration and live act access.
          </p>
        </div>

        {/* Live Voting Action Card */}
        <div
          className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="relative z-10 space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-white/20 backdrop-blur-md text-white">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              People&apos;s Choice Live Voting
            </div>
            <h2 className="text-xl sm:text-2xl font-bold leading-snug">
              Ready to rate tonight&apos;s stage performances?
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              When an act goes live on stage, real-time voting opens on your phone. Rate each act with 1–5 stars to crown the winner!
            </p>
            <div>
              <Link
                href="/vote"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold shadow-md transition hover:bg-slate-50 active:scale-95"
                style={{ color: "var(--primary)" }}
              >
                <span>Go to Live Voting</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Student Profile Information Card */}
        <div
          className="rounded-3xl border p-6 sm:p-7 shadow-sm"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl font-bold text-white shadow-sm"
                style={{ background: "var(--gradient-hero)" }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Profile</h3>
                <p className="text-xs text-slate-500">Official Festival Registration</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-2xl border p-3.5 bg-slate-50/70 border-slate-200/70 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <User className="h-3.5 w-3.5 text-purple-600" />
                <span>Student Name</span>
              </div>
              <p className="font-bold text-sm text-slate-900">{name}</p>
            </div>

            <div className="rounded-2xl border p-3.5 bg-slate-50/70 border-slate-200/70 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Hash className="h-3.5 w-3.5 text-purple-600" />
                <span>Register Number</span>
              </div>
              <p className="font-mono font-bold text-sm text-slate-900">{registerNumber}</p>
            </div>

            <div className="rounded-2xl border p-3.5 bg-slate-50/70 border-slate-200/70 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Building2 className="h-3.5 w-3.5 text-purple-600" />
                <span>Department</span>
              </div>
              <p className="font-bold text-sm text-slate-900">{departmentName}</p>
            </div>

            <div className="rounded-2xl border p-3.5 bg-slate-50/70 border-slate-200/70 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Calendar className="h-3.5 w-3.5 text-purple-600" />
                <span>Year of Study</span>
              </div>
              <p className="font-bold text-sm text-slate-900">{formatYearLabel(year)}</p>
            </div>

            <div className="rounded-2xl border p-3.5 bg-slate-50/70 border-slate-200/70 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Layers className="h-3.5 w-3.5 text-purple-600" />
                <span>Section</span>
              </div>
              <p className="font-bold text-sm text-slate-900">Section {section}</p>
            </div>

            <div className="rounded-2xl border p-3.5 bg-slate-50/70 border-slate-200/70 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                <span>College Email</span>
              </div>
              <p className="font-mono font-medium text-xs text-slate-700 truncate">{email}</p>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-400 italic text-center">
            Your registration details are locked to your official Google account. For any corrections, please contact the festival administrator.
          </p>
        </div>

        {/* Tonight's Lineup Preview */}
        <div
          className="rounded-3xl border p-6 sm:p-7 shadow-sm"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">Festival Act Lineup</h3>
            </div>
            <Link
              href="/vote"
              className="text-xs font-semibold text-primary hover:underline"
              style={{ color: "var(--primary)" }}
            >
              View live board →
            </Link>
          </div>

          {perfsLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : performances.length === 0 ? (
            <EmptyState
              title="Lineup will appear shortly"
              description="Stage coordinators are preparing the act lineup for tonight's cultural fest."
            />
          ) : (
            <ol className="space-y-2" aria-label="Performance lineup">
              {performances.slice(0, 5).map((perf, index) => {
                const perfDept = deptMap[perf.departmentId];
                const perfCat = catMap[perf.categoryId];
                return (
                  <li
                    key={perf.id}
                    className="flex items-center justify-between rounded-2xl border p-3 bg-slate-50/50 border-slate-200/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-xs"
                        style={{ background: "var(--gradient-hero)" }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{perf.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{perfCat?.name ?? "Cultural Act"}</p>
                      </div>
                    </div>
                    {perfDept && (
                      <DepartmentChip
                        name={perfDept.name}
                        shortName={perfDept.shortName}
                        color={perfDept.color}
                        className="shrink-0 text-[10px]"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </main>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <AuthGuard requireReady>
      <StudentDashboardContent />
    </AuthGuard>
  );
}
