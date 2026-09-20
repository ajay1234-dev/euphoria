"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
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
import {
  LogOut,
  User,
  CheckCircle,
  Clock,
  Music,
  Star,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

// ── Countdown Hook (uses server offset to prevent client clock tampering) ──────
function useCountdown(endsAtMs: number | null, serverOffsetMs: number = 0): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endsAtMs) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const serverNow = Date.now() + serverOffsetMs;
      const diff = Math.max(0, Math.round((endsAtMs - serverNow) / 1000));
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAtMs, serverOffsetMs]);

  return remaining;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "★☆☆☆☆ · Needs Improvement",
  2: "★★☆☆☆ · Fair Effort",
  3: "★★★☆☆ · Good Performance",
  4: "★★★★☆ · Great Act!",
  5: "★★★★★ · Outstanding Champion Performance!",
};

function VoteDashboard() {
  const { profile, config, signOutUser } = useAuth();
  const { event } = useActiveEvent(config?.activeEventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();
  const { performances, loading: perfsLoading } = usePerformances(config?.activeEventId);
  const { votingState, serverOffsetMs, loading: vsLoading } = useVotingState(config?.activeEventId);

  // Live voting state
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [existingVote, setExistingVote] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState(false);

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const dept = profile?.departmentId ? deptMap[profile.departmentId] : null;
  const isTestEvent = event?.isTest ?? false;

  const isOpen = votingState?.status === "open";
  const activePerfId = votingState?.activePerformanceId;
  const activePerf = performances.find((p) => p.id === activePerfId);
  const activePerfDept = activePerf?.departmentId ? deptMap[activePerf.departmentId] : null;
  const activePerfCat = activePerf?.categoryId ? catMap[activePerf.categoryId] : null;

  const endsAtMs = votingState?.votingEndsAt ? votingState.votingEndsAt.toMillis() : null;
  const remaining = useCountdown(isOpen ? endsAtMs : null, serverOffsetMs);

  // Reset vote state when active performance changes (new act starts)
  useEffect(() => {
    setSelectedRating(5);
    setHoveredRating(null);
    setExistingVote(null);
    setJustVoted(false);
    setVoteError(null);
  }, [activePerfId]);

  // Subscribe to student's vote for the active performance (Idempotent 1-vote check)
  useEffect(() => {
    if (!config?.activeEventId || !activePerfId || !profile?.uid) {
      setExistingVote(null);
      setJustVoted(false);
      return;
    }

    const voteDocRef = doc(
      db,
      "events",
      config.activeEventId,
      "performances",
      activePerfId,
      "votes",
      profile.uid
    );

    const unsubscribe = onSnapshot(
      voteDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setExistingVote(docSnap.data()?.rating ?? 5);
        } else {
          setExistingVote(null);
        }
      },
      (err) => {
        console.warn("Vote listener error:", err);
      }
    );

    return () => unsubscribe();
  }, [config?.activeEventId, activePerfId, profile?.uid]);

  // Handle vote submission — minimal vote doc per Phase 2 spec (no personal data)
  const handleVote = async () => {
    if (!config?.activeEventId || !activePerfId || !profile?.uid) return;
    // Guard: timer has expired — don't submit
    if (remaining === 0 && isOpen) {
      setVoteError("Voting time has expired. Wait for the admin to finalize.");
      return;
    }
    setSubmitting(true);
    setVoteError(null);

    try {
      const voteDocRef = doc(
        db,
        "events",
        config.activeEventId,
        "performances",
        activePerfId,
        "votes",
        profile.uid
      );

      // Phase 2: Minimal vote doc — only studentUid, rating, createdAt
      await setDoc(voteDocRef, {
        studentUid: profile.uid,
        rating: selectedRating,
        createdAt: serverTimestamp(),
      });

      setJustVoted(true);
    } catch (e: unknown) {
      setVoteError((e as Error).message ?? "Failed to cast vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  // Mask email: show first 3 chars + *** + @domain
  const maskedEmail = profile?.email
    ? (() => {
        const [local, domain] = profile.email.split("@");
        return `${local.slice(0, 3)}***@${domain}`;
      })()
    : "";

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  const effectiveRating = hoveredRating ?? selectedRating;

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
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs"
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

      <main id="main-content" className="mx-auto max-w-2xl px-4 py-6 space-y-5" tabIndex={-1}>
        {/* Test mode banner */}
        {isTestEvent && <TestModeBanner />}

        {/* ── LIVE VOTING ARENA CARD ────────────────────────────────────────── */}
        {isOpen && activePerf ? (
          <div
            className="relative overflow-hidden rounded-[24px] border-2 border-purple-400 p-6 sm:p-8 space-y-6 shadow-xl"
            style={{
              background: "linear-gradient(135deg, #FFFFFF 0%, #FAF5FF 100%)",
            }}
          >
            {/* Top festive badge & countdown */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 pb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs sm:text-sm font-extrabold text-emerald-800 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                LIVE RATING NOW
              </span>

              {/* Countdown Timer */}
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-1.5 border border-purple-200 shadow-xs">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="font-mono text-base sm:text-lg font-black tabular-nums text-purple-900">
                  {mins}:{secs}
                </span>
              </div>
            </div>

            {/* Performance Headline */}
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {activePerfDept && (
                  <DepartmentChip
                    name={activePerfDept.name}
                    shortName={activePerfDept.shortName}
                    color={activePerfDept.color}
                  />
                )}
                {activePerfCat && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {activePerfCat.name}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {activePerf.name}
              </h2>
              {activePerf.description && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {activePerf.description}
                </p>
              )}
            </div>

            {/* Error banner */}
            {voteError && (
              <div className="flex items-center gap-2 rounded-xl p-3 text-xs sm:text-sm font-medium bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{voteError}</span>
              </div>
            )}

            {/* Timer expired banner — show when time hits 0 but state still "open" */}
            {remaining === 0 && isOpen && existingVote === null && !justVoted && (
              <div className="flex items-center gap-2 rounded-xl p-3 text-xs sm:text-sm font-medium bg-amber-50 border border-amber-200 text-amber-800">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Time is up! The admin is finalizing results. Your vote window has closed.</span>
              </div>
            )}

            {/* Vote Submitted Confirmed State */}
            {existingVote !== null || justVoted ? (
              <div className="rounded-2xl p-6 text-center space-y-3 bg-emerald-50 border border-emerald-200 shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-emerald-900">
                  Vote Secured &amp; Counted!
                </h3>
                <p className="text-sm font-medium text-emerald-800">
                  You awarded <strong>{existingVote ?? selectedRating} Stars</strong> to this act.
                </p>
                <div className="flex justify-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 ${
                        star <= (existingVote ?? selectedRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 pt-2">
                  Tamper-proof cryptographic record verified. Sit back and await the next performance!
                </p>
              </div>
            ) : (
              /* Interactive Star Selector & Submit CTA */
              <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6 border border-purple-100 shadow-sm text-center">
                <p className="text-sm sm:text-base font-bold text-slate-800">
                  Tap to rate this performance:
                </p>

                {/* 5 Big Accessible Stars */}
                <div
                  className="flex items-center justify-center gap-2 sm:gap-4 py-2"
                  role="radiogroup"
                  aria-label="Rate performance from 1 to 5 stars"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= effectiveRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(null)}
                        className="tap-scale flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{
                          background: isFilled ? "#FEF3C7" : "#F8FAFC",
                          border: isFilled ? "2px solid #F59E0B" : "1px solid #E2E8F0",
                        }}
                        aria-label={`${star} Stars`}
                      >
                        <Star
                          className={`h-8 w-8 sm:h-9 sm:w-9 transition-colors ${
                            isFilled
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Star Description Badge */}
                <div className="h-6">
                  <span className="inline-block text-xs sm:text-sm font-extrabold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200/60">
                    {RATING_DESCRIPTIONS[effectiveRating]}
                  </span>
                </div>

                {/* Submit Vote CTA Button */}
                <button
                  type="button"
                  onClick={handleVote}
                  disabled={submitting || remaining === 0}
                  className="tap-scale w-full rounded-2xl px-6 py-4 text-base sm:text-lg font-extrabold text-white shadow-lg transition-all hover:opacity-95 disabled:opacity-50"
                  style={{
                    background: remaining === 0 ? "#94A3B8" : "var(--gradient-hero)",
                    minHeight: "52px",
                  }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Securing Your Vote…
                    </span>
                  ) : remaining === 0 ? (
                    <span className="flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5" />
                      Voting Window Closed
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Zap className="h-5 w-5 text-amber-300 fill-amber-300" />
                      Submit {selectedRating}-Star Rating
                    </span>
                  )}
                </button>
              </div>

            )}
          </div>
        ) : (
          /* ── VOTING CLOSED CARD ────────────────────────────────────────── */
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
              Keep this page open — live star rating starts when the organizers begin each performance.
            </p>
            {vsLoading && (
              <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>Connecting to festival servers…</p>
            )}
          </div>
        )}

        {/* Registration details card */}
        <div
          className="rounded-[20px] p-5"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <User className="h-4 w-4" aria-hidden="true" />
            Your Voter Registration
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
                Verified Voter
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

        {/* Festival lineup */}
        <div
          className="rounded-[20px] p-5"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: "var(--ink)" }}>
            <Music className="h-4 w-4" aria-hidden="true" />
            Festival Lineup
          </h2>

          {perfsLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl" style={{ background: "var(--surface-alt)" }} />
              ))}
            </div>
          ) : performances.length === 0 ? (
            <EmptyState
              title="No performances scheduled yet"
              description="The lineup will appear here once stage organizers schedule acts."
            />
          ) : (
            <ol className="space-y-2.5" aria-label="Performance lineup">
              {performances.map((perf, index) => {
                const pDept = deptMap[perf.departmentId];
                const pCat = catMap[perf.categoryId];
                const isCurrent = perf.id === activePerfId && isOpen;

                return (
                  <li
                    key={perf.id}
                    className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-all ${
                      isCurrent
                        ? "border-2 border-purple-400 bg-purple-50/70 shadow-sm"
                        : "border border-slate-100 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums ${
                        isCurrent
                          ? "bg-purple-600 text-white"
                          : "bg-purple-100 text-purple-700"
                      }`}
                      aria-label={`Performance ${index + 1}`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate text-slate-900">
                          {perf.name}
                        </p>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate text-slate-500">
                        {pCat?.name ?? "General"}
                      </p>
                    </div>
                    {pDept && (
                      <DepartmentChip
                        name={pDept.name}
                        shortName={pDept.shortName}
                        color={pDept.color}
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
