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
            className="font-heading text-xl tracking-wide uppercase text-[#2C1B6B]"
          >
            {festName}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#FEF0D9] text-[#D48006] border border-[#F2960B]/30">
            <i className="bi bi-stars text-xs" />
            Student Portal
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Dedicated Header Button to Access Student Profile */}
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="tap-scale inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border border-[#E8DFC8] bg-[#FFFBF3] px-2.5 sm:px-3 py-1.5 text-xs font-bold text-[#2C1B6B] transition hover:bg-[#FEF0D9] shadow-xs cursor-pointer"
            title="View Student Profile"
          >
            <i className="bi bi-person-circle text-[#2C1B6B] text-xs" />
            <span>Profile</span>
          </button>

          <Link
            href="/vote"
            className="tap-scale inline-flex items-center gap-1 sm:gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95"
            style={{ background: "var(--gradient-hero)" }}
          >
            <i className="bi bi-star-fill text-[#FFC94A] text-xs" />
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
            <h1 className="font-heading text-2xl sm:text-3xl text-[#2C1B6B] tracking-tight">
              Welcome, {name} 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#5B5470]">
              Here is your verified festival registration and live stage access.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setProfileModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 border-[#E8DFC8] bg-white text-[#2C1B6B] hover:bg-[#FFFBF3] text-xs font-bold rounded-xl h-9"
          >
            <i className="bi bi-shield-check text-[#F2960B] text-sm" />
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
              <i className="bi bi-star-fill text-[#FFC94A] text-xs" />
              People&apos;s Choice Live Rating
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-normal leading-snug tracking-wide">
              Ready to rate festival stage acts?
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              When an act goes live on stage, real-time star rating opens on your phone. Rate each act with 1 to 5 stars to help crown the champion!
            </p>
            <div>
              <Link
                href="/vote"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold shadow-md transition hover:bg-[#FFFBF3] active:scale-95 text-[#2C1B6B]"
              >
                <span>Open Rating Arena</span>
                <i className="bi bi-arrow-right text-sm" />
              </Link>
            </div>
          </div>
        </div>

        {/* Dedicated Separate Area: Student Profile Quick Access Card */}
        <div
          className="rounded-2xl border border-[#E8DFC8] bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md cursor-pointer"
          onClick={() => setProfileModalOpen(true)}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-heading text-white shadow-xs text-xl bg-[#2C1B6B]"
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base text-[#2C1B6B]">{name}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <i className="bi bi-check-circle-fill text-emerald-600 text-xs" /> Verified
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#5B5470] font-mono tabular-nums">
                  <span>Reg: <strong className="text-[#1A1230]">{registerNumber}</strong></span>
                  <span>•</span>
                  <span>{departmentName}</span>
                  <span>•</span>
                  <span>Sec {section}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#F2960B] sm:self-center">
              <span>View Full Student Profile</span>
              <i className="bi bi-chevron-right text-xs" />
            </div>
          </div>
        </div>

        {/* Festival Lineup Preview */}
        <div
          className="rounded-3xl border border-[#E8DFC8] bg-white p-6 sm:p-7 shadow-xs"
        >
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#F0E4CE]">
            <div>
              <h3 className="font-heading text-lg text-[#2C1B6B] flex items-center gap-2">
                <i className="bi bi-music-note-beamed text-[#F2960B] text-sm" />
                <span>Festival Cultural Acts</span>
              </h3>
              <p className="text-xs text-[#5B5470]">
                {event ? `${event.name} — Schedule & Performances` : "Official Event Lineup"}
              </p>
            </div>

            <Link
              href="/vote"
              className="text-xs font-bold text-[#F2960B] hover:underline flex items-center gap-1"
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
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-[#F0E4CE] bg-[#FFFBF3] hover:bg-[#FEF0D9]/30 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#FEF0D9] text-[#D48006] text-xs font-heading font-bold">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-heading text-xs sm:text-sm text-[#2C1B6B] truncate">
                          {perf.name}
                        </p>
                        <p className="text-[11px] text-[#5B5470] truncate">
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
          {/* Header Banner - Radiant Festival Sunset Gradient */}
          <div
            className="p-6 text-white relative overflow-hidden bg-gradient-to-r from-[#F2960B] via-[#E85D04] to-[#D6266E]"
          >
            {/* Ambient festival glow circles */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-black/10 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between pr-10 relative z-10">
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-black/25 backdrop-blur-md text-white border border-white/20 shadow-xs">
                <i className="bi bi-stars text-xs text-[#FFC94A]" />
                <span>{config?.festName ?? "Euphoria 2026"} Official ID</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-white text-emerald-800 shadow-sm">
                <i className="bi bi-check-circle-fill text-xs text-emerald-600" /> Verified
              </span>
            </div>

            <div className="mt-5 flex items-center gap-4 relative z-10">
              <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2C1B6B] font-heading text-2xl shadow-lg border-2 border-white/60">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <DialogTitle
                  className="font-heading text-2xl !text-white leading-tight tracking-wide drop-shadow-xs"
                  style={{ color: "#ffffff" }}
                >
                  {name}
                </DialogTitle>
                <DialogDescription
                  className="text-xs !text-amber-100 font-mono tabular-nums font-semibold tracking-wider"
                  style={{ color: "rgba(254, 243, 199, 0.95)" }}
                >
                  Reg. #{registerNumber}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Detailed Credentials */}
          <div className="p-6 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#FFFBF3] border border-[#F0E4CE] space-y-1">
                <span className="text-[#5B5470] font-medium flex items-center gap-1">
                  <i className="bi bi-hash text-[#2C1B6B] text-sm" /> Register Number
                </span>
                <p className="font-mono tabular-nums font-bold text-[#1A1230] text-sm">{registerNumber}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFFBF3] border border-[#F0E4CE] space-y-1">
                <span className="text-[#5B5470] font-medium flex items-center gap-1">
                  <i className="bi bi-calendar-event text-[#2C1B6B] text-sm" /> Academic Year
                </span>
                <p className="font-bold text-[#1A1230] text-sm">{formatYearLabel(year)}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFFBF3] border border-[#F0E4CE] space-y-1">
                <span className="text-[#5B5470] font-medium flex items-center gap-1">
                  <i className="bi bi-diagram-3 text-[#2C1B6B] text-sm" /> Department
                </span>
                <p className="font-bold text-[#1A1230] text-xs truncate">{departmentName}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFFBF3] border border-[#F0E4CE] space-y-1">
                <span className="text-[#5B5470] font-medium flex items-center gap-1">
                  <i className="bi bi-layers text-[#2C1B6B] text-sm" /> Section
                </span>
                <p className="font-bold text-[#1A1230] text-sm">Section {section}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFFBF3] border border-[#F0E4CE] space-y-1">
              <span className="text-[#5B5470] font-medium flex items-center gap-1 text-xs">
                <i className="bi bi-envelope-fill text-[#2C1B6B] text-sm" /> Official College Email
              </span>
              <p className="font-mono text-xs font-semibold text-[#1A1230] break-all">{email}</p>
            </div>

            {/* Immutability Notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FEF0D9]/60 border border-[#F2960B]/30 text-[11px] text-[#2C1B6B]">
              <i className="bi bi-lock-fill text-[#D48006] shrink-0 mt-0.5 text-sm" />
              <span>
                Your festival profile is cryptographically verified to your college Google account. For any corrections, contact the event admin.
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
