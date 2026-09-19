"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useActiveEvent, useDepartments, useCategories, usePerformances } from "@/hooks/useData";
import { useVotingState } from "@/hooks/useVotingState";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TestModeBanner } from "@/components/common/TestModeBanner";
import { DepartmentChip } from "@/components/common/DepartmentChip";
import { EmptyState } from "@/components/common/EmptyState";
import { FestBackground } from "@/components/common/FestBackground";
import { formatDate } from "@/lib/utils";
import { formatYearLabel } from "@/config/departments";
import { LogOut, User, CheckCircle, Clock, Music } from "lucide-react";

function VoteDashboard() {
  const { profile, config, signOutUser } = useAuth();
  const { event } = useActiveEvent(config?.activeEventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();
  const { performances, loading: perfsLoading } = usePerformances(config?.activeEventId);
  const { loading: vsLoading } = useVotingState(config?.activeEventId);

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const dept = profile?.departmentId ? deptMap[profile.departmentId] : null;
  const isTestEvent = event?.isTest ?? false;

  // Mask email: show first 3 chars + *** + @domain
  const maskedEmail = profile?.email
    ? (() => {
        const [local, domain] = profile.email.split("@");
        return `${local.slice(0, 3)}***@${domain}`;
      })()
    : "";

  return (
    <div
      className="min-h-dvh"
      style={{ background: "var(--bg)" }}
    >
      <FestBackground />

      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-bricolage)", color: "var(--primary)" }}
        >
          {config?.festName ?? "Euphoria"}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/student/dashboard"
            className="flex items-center gap-1.5 rounded-[10px] border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            title="My Student Dashboard"
          >
            <User className="h-3.5 w-3.5 text-purple-600" />
            <span className="hidden xs:inline">Dashboard</span>
          </Link>

          {/* Avatar */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: "var(--gradient-hero)" }}
            aria-hidden="true"
          >
            {profile?.fullName?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <button
            onClick={signOutUser}
            className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-medium transition-colors"
            style={{ color: "var(--ink-muted)", minHeight: "40px" }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-2xl px-4 py-6 space-y-4" tabIndex={-1}>
        {/* Test mode banner */}
        {isTestEvent && <TestModeBanner />}

        {/* Voting status card */}
        <div
          className="rounded-[20px] p-6 text-center"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "var(--primary-soft)" }}
            aria-hidden="true"
          >
            <Clock className="h-8 w-8" style={{ color: "var(--primary)" }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--ink)" }}>
            Voting is currently closed
          </h1>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--ink-muted)" }}>
            Keep this page open — voting starts when the organizers begin each performance.
          </p>
          {vsLoading && (
            <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>Connecting…</p>
          )}
        </div>

        {/* Registration card */}
        <div
          className="rounded-[20px] p-5"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <User className="h-4 w-4" aria-hidden="true" />
            Your registration
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <dt style={{ color: "var(--ink-muted)" }}>Name</dt>
              <dd className="font-medium" style={{ color: "var(--ink)" }}>{profile?.fullName}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <dt style={{ color: "var(--ink-muted)" }}>Email</dt>
              <dd className="font-medium font-mono text-xs" style={{ color: "var(--ink)" }}>{maskedEmail}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <dt style={{ color: "var(--ink-muted)" }}>Status</dt>
              <dd className="flex items-center gap-1 font-semibold" style={{ color: "var(--success)" }}>
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Verified
              </dd>
            </div>
            {dept && (
              <div className="flex flex-wrap items-center justify-between gap-1">
                <dt style={{ color: "var(--ink-muted)" }}>Department</dt>
                <dd><DepartmentChip name={dept.name} shortName={dept.shortName} color={dept.color} /></dd>
              </div>
            )}
            {profile?.year && (
              <div className="flex flex-wrap items-center justify-between gap-1">
                <dt style={{ color: "var(--ink-muted)" }}>Year</dt>
                <dd className="font-semibold" style={{ color: "var(--ink)" }}>{formatYearLabel(profile.year)}</dd>
              </div>
            )}
            {profile?.section && (
              <div className="flex flex-wrap items-center justify-between gap-1">
                <dt style={{ color: "var(--ink-muted)" }}>Section</dt>
                <dd className="font-semibold" style={{ color: "var(--ink)" }}>Section {profile.section}</dd>
              </div>
            )}
            {profile?.studentId && (
              <div className="flex flex-wrap items-center justify-between gap-1">
                <dt style={{ color: "var(--ink-muted)" }}>Register No.</dt>
                <dd className="font-mono text-xs font-medium" style={{ color: "var(--ink)" }}>{profile.studentId}</dd>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-1">
              <dt style={{ color: "var(--ink-muted)" }}>Registered</dt>
              <dd className="font-medium" style={{ color: "var(--ink)" }}>{formatDate(profile?.createdAt || profile?.registeredAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Tonight's lineup */}
        <div
          className="rounded-[20px] p-5"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <Music className="h-4 w-4" aria-hidden="true" />
            Tonight&apos;s lineup
          </h2>

          {perfsLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl" style={{ background: "var(--surface-alt)" }} />
              ))}
            </div>
          ) : performances.length === 0 ? (
            <EmptyState
              title="No performances yet"
              description="The lineup will appear here once the organizers add performances."
            />
          ) : (
            <ol className="space-y-2" aria-label="Performance lineup">
              {performances.map((perf, index) => {
                const dept = deptMap[perf.departmentId];
                const cat = catMap[perf.categoryId];
                return (
                  <li
                    key={perf.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-3"
                    style={{ background: "var(--surface-alt)" }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
                      style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                      aria-label={`Performance ${index + 1}`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>
                        {perf.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--ink-muted)" }}>
                        {cat?.name ?? "—"}
                      </p>
                    </div>
                    {dept && (
                      <DepartmentChip
                        name={dept.name}
                        shortName={dept.shortName}
                        color={dept.color}
                        className="shrink-0"
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

export default function VotePage() {
  return (
    <AuthGuard requireReady>
      <VoteDashboard />
    </AuthGuard>
  );
}
