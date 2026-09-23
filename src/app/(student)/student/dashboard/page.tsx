"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useActiveEvent, useDepartments, useCategories, usePerformances } from "@/hooks/useData";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DepartmentChip } from "@/components/common/DepartmentChip";
import { EmptyState } from "@/components/common/EmptyState";
import { FestBackground } from "@/components/common/FestBackground";
import { formatYearLabel, getDepartmentFromCode } from "@/config/departments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";


function StudentDashboardContent() {
  const { studentProfile, profile, config, signOutUser } = useAuth();
  const { event } = useActiveEvent(config?.activeEventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();
  const { performances, loading: perfsLoading } = usePerformances(config?.activeEventId);

  // State to open separate Student Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Pull fields from studentProfile or fallback to profile
  const name = studentProfile?.name || profile?.fullName || profile?.name || "Student";
  const registerNumber = studentProfile?.registerNumber || profile?.registerNumber || profile?.studentId || "—";
  const year = studentProfile?.year || profile?.year || 1;
  const deptCode = studentProfile?.departmentCode || profile?.departmentCode || "";
  const officialDept = getDepartmentFromCode(deptCode);
  const departmentName = studentProfile?.department || officialDept?.name || profile?.department || "General";
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
            <i className="bi bi-stars text-xs" />
            Student Portal
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Dedicated Header Button to Access Student Profile */}
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="tap-scale inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border border-purple-200 bg-purple-50/80 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-purple-700 transition hover:bg-purple-100 shadow-xs cursor-pointer"
            title="View Student Profile"
          >
            <i className="bi bi-person-circle text-purple-600 text-xs" />
            <span>Profile</span>
          </button>

          <Link
            href="/vote"
            className="tap-scale inline-flex items-center gap-1 sm:gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95"
            style={{ background: "var(--gradient-hero)" }}
          >
            <i className="bi bi-star-fill text-amber-300 text-xs" />
            <span>Vote</span>
          </Link>

          <button
            type="button"
            onClick={signOutUser}
            className="tap-scale inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-200 px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 cursor-pointer"
            aria-label="Sign out"
          >
            <i className="bi bi-box-arrow-right text-xs" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
        {/* Welcome Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setProfileModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100 text-xs font-bold rounded-xl h-9"
          >
            <i className="bi bi-shield-check text-purple-600 text-sm" />
            <span>View Student ID Pass</span>
          </Button>
        </div>

        {/* Live Voting Action Card */}
        <div
          className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="relative z-10 space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-white/20 backdrop-blur-md text-white">
              <i className="bi bi-star-fill text-amber-300 text-xs" />
              People&apos;s Choice Live Rating &amp; Likes
            </div>
            <h2 className="text-xl sm:text-2xl font-bold leading-snug">
              Ready to rate and like festival stage performances?
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              When an act goes live on stage, real-time rating &amp; liking opens on your phone. Rate each act with 1–5 stars to crown the winner!
            </p>
            <div>
              <Link
                href="/vote"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold shadow-md transition hover:bg-slate-50 active:scale-95"
                style={{ color: "var(--primary)" }}
              >
                <span>Go to Live Rating Arena</span>
                <i className="bi bi-arrow-right text-sm" />
              </Link>
            </div>
          </div>
        </div>

        {/* Dedicated Separate Area: Student Profile Quick Access Card */}
        <div
          className="rounded-2xl border p-4 sm:p-5 shadow-sm transition hover:shadow-md cursor-pointer"
          onClick={() => setProfileModalOpen(true)}
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-sm text-lg"
                style={{ background: "var(--gradient-hero)" }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{name}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <i className="bi bi-check-circle-fill text-emerald-600 text-xs" /> Verified
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>Reg: <strong className="text-slate-800">{registerNumber}</strong></span>
                  <span>•</span>
                  <span>{departmentName}</span>
                  <span>•</span>
                  <span>Sec {section}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-primary sm:self-center">
              <span>View Full Student Profile</span>
              <i className="bi bi-chevron-right text-xs" />
            </div>
          </div>
        </div>

        {/* Festival Lineup Preview */}
        <div
          className="rounded-3xl border p-6 sm:p-7 shadow-sm"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="bi bi-music-note-beamed text-primary text-sm" />
                <span>Festival Cultural Acts</span>
              </h3>
              <p className="text-xs text-slate-500">
                {event ? `${event.name} — Schedule & Performances` : "Official Event Lineup"}
              </p>
            </div>

            <Link
              href="/vote"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              style={{ color: "var(--primary)" }}
            >
              <span>View In Arena</span>
              <i className="bi bi-arrow-right text-xs" />
            </Link>
          </div>

          {perfsLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading acts schedule…</div>
          ) : performances.length === 0 ? (
            <EmptyState
              title="No acts scheduled yet"
              description="The stage schedule is being finalized by coordinators. Check back when the fest begins!"
            />
          ) : (
            <ol className="space-y-3">
              {performances.map((perf, index) => {
                const perfDept = deptMap[perf.departmentId];
                const perfCat = catMap[perf.categoryId];

                return (
                  <li
                    key={perf.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {perf.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {perfCat?.name || "General Act"}
                        </p>
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

      {/* ── SEPARATE STUDENT PROFILE DIALOG / MODAL ── */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          {/* Header Banner */}
          <div
            className="p-6 text-white relative overflow-hidden"
            style={{ background: "var(--gradient-hero)" }}
          >
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-white/20 backdrop-blur-md text-white">
                <i className="bi bi-stars text-xs" />
                <span>{config?.festName ?? "Euphoria 2026"} Official ID</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-400/90 text-emerald-950">
                <i className="bi bi-check-circle-fill text-xs" /> Verified
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-purple-700 font-extrabold text-2xl shadow-md">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-white leading-tight">
                  {name}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/80 mt-0.5 font-mono">
                  {registerNumber}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Detailed Credentials */}
          <div className="p-6 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <i className="bi bi-hash text-purple-600 text-sm" /> Register Number
                </span>
                <p className="font-mono font-bold text-slate-900 text-sm">{registerNumber}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <i className="bi bi-calendar-event text-purple-600 text-sm" /> Academic Year
                </span>
                <p className="font-bold text-slate-900 text-sm">{formatYearLabel(year)}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <i className="bi bi-diagram-3 text-purple-600 text-sm" /> Department
                </span>
                <p className="font-bold text-slate-900 text-xs truncate">{departmentName}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <i className="bi bi-layers text-purple-600 text-sm" /> Section
                </span>
                <p className="font-bold text-slate-900 text-sm">Section {section}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1 text-xs">
                <i className="bi bi-envelope-fill text-purple-600 text-sm" /> Official College Email
              </span>
              <p className="font-mono text-xs font-semibold text-slate-800 break-all">{email}</p>
            </div>

            {/* Immutability Notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-900">
              <i className="bi bi-lock-fill text-purple-600 shrink-0 mt-0.5 text-sm" />
              <span>
                Your festival profile is cryptographically locked to your college Google account. For any corrections, contact the event admin.
              </span>
            </div>

            <Button
              onClick={() => setProfileModalOpen(false)}
              className="w-full rounded-2xl font-bold h-11"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
