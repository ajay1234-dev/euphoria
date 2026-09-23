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
import { getPerformanceImage } from "@/config/constants";

import PeekRating from "@/components/ui/PeekRating";


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
  1: "20% · Needs Improvement",
  2: "40% · Good Effort",
  3: "60% · Good Performance",
  4: "80% · Excellent Performance",
  5: "100% · Outstanding Champion Performance!",
};

function VoteDashboard() {
  const { profile, config, signOutUser } = useAuth();
  const { event } = useActiveEvent(config?.activeEventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();
  const { performances, loading: perfsLoading } = usePerformances(config?.activeEventId);
  const { votingState, serverOffsetMs, loading: vsLoading } = useVotingState(config?.activeEventId);

  // Live voting state — starts at 0 (empty hearts until student taps)
  const [selectedRating, setSelectedRating] = useState<number>(0);
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

  // ── Event Day Gate: when eventOpen is false, show Coming Soon screen ──────
  const isSystemOpen = config?.eventOpen === true;

  // ── Department voting block: student cannot vote for their own dept's act ──
  // Checks departmentId, departmentCode (e.g. IT, 103), and full department name
  const isStudentDeptBlocked =
    isOpen &&
    activePerf?.departmentId != null &&
    Boolean(
      (profile?.departmentId && activePerf.departmentId === profile.departmentId) ||
      (profile?.departmentCode && activePerfDept?.shortName &&
        profile.departmentCode.toLowerCase() === activePerfDept.shortName.toLowerCase()) ||
      (profile?.departmentCode && (activePerfDept as unknown as { code?: string })?.code &&
        profile.departmentCode.toLowerCase() === (activePerfDept as unknown as { code?: string }).code?.toLowerCase()) ||
      (profile?.department && activePerfDept?.name &&
        profile.department.toLowerCase() === activePerfDept.name.toLowerCase())
    );

  const endsAtMs = votingState?.votingEndsAt ? votingState.votingEndsAt.toMillis() : null;
  const remaining = useCountdown(isOpen ? endsAtMs : null, serverOffsetMs);

  // Reset vote state when active performance changes (new act starts)
  useEffect(() => {
    setSelectedRating(0);
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
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      setVoteError("Please tap 1 to 5 hearts to select your rating before submitting.");
      return;
    }
    // Guard: timer has expired — don't submit
    if (remaining === 0 && isOpen) {
      setVoteError("Rating time has expired. Wait for the admin to finalize.");
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

      // Minimal rating doc: studentUid, rating, createdAt
      await setDoc(voteDocRef, {
        studentUid: profile.uid,
        rating: selectedRating,
        createdAt: serverTimestamp(),
      });

      setJustVoted(true);
    } catch (e: unknown) {
      setVoteError((e as Error).message ?? "Failed to submit rating. Please try again.");
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

  // Upcoming / next scheduled performance for standby display
  const upcomingPerf = performances.find((p) => p.status === "scheduled") || performances[0] || null;
  const upcomingDept = upcomingPerf?.departmentId ? deptMap[upcomingPerf.departmentId] : null;
  const upcomingCat = upcomingPerf?.categoryId ? catMap[upcomingPerf.categoryId] : null;

  return (
    <div
      className="min-h-dvh"
      style={{ background: "var(--bg)" }}
    >
      <FestBackground />

      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-4 py-3"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/student/dashboard"
            className="tap-scale flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 shadow-xs transition"
            title="Back to Student Dashboard"
          >
            <i className="bi bi-arrow-left text-purple-700 text-xs" />
            <span className="font-bold">Dashboard</span>
          </Link>
          <span
            className="text-base sm:text-lg font-bold"
            style={{ fontFamily: "var(--font-bricolage)", color: "var(--primary)" }}
          >
            {config?.festName ?? "Euphoria"}
          </span>
          <span className="hidden xs:inline text-xs font-semibold text-slate-400">·</span>
          <span className="hidden xs:inline text-xs font-bold text-slate-600">Live Rating &amp; Likes</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5">
          {dept && (
            <DepartmentChip name={dept.name} shortName={dept.shortName} color={dept.color} />
          )}
          <button
            onClick={signOutUser}
            className="flex items-center gap-1.5 rounded-[10px] border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            aria-label="Sign out"
          >
            <i className="bi bi-box-arrow-right text-xs" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── EVENT DAY GATE — full screen Coming Soon when system is closed ── */}
      {!isSystemOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-6"
          style={{ background: "var(--bg)" }}
        >
          <FestBackground />
          <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm">
            {/* Lock icon */}
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
              style={{ background: "var(--gradient-hero)" }}
            >
              <i className="bi bi-lock-fill text-white text-5xl" />
            </div>
            {/* Title */}
            <div className="space-y-2">
              <h1
                className="text-4xl font-black tracking-tight"
                style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}
              >
                {config?.festName ?? "Euphoria 2026"}
              </h1>
              <p className="text-xl font-bold" style={{ color: "var(--ink)" }}>
                Rating &amp; Likes Open on Event Day
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                The live rating and likes system will be unlocked by the admin on the day of the festival.
                Please check back then — this page will automatically update!
              </p>
            </div>
            {/* Action buttons on lock screen */}
            <div className="flex flex-col items-center gap-3">
              <Link
                href="/student/dashboard"
                className="tap-scale inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition"
              >
                <i className="bi bi-arrow-left text-purple-600 text-sm" />
                <span>Return to Student Dashboard</span>
              </Link>
              {/* Pulsing dot */}
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-600">System Offline — Standing By</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <main id="main-content" className="mx-auto max-w-2xl px-4 py-6 space-y-5" tabIndex={-1}>
        {/* Test mode banner */}
        {isTestEvent && <TestModeBanner />}

        {/* ── LIVE RATING ARENA CARD ────────────────────────────────────────── */}
        {isOpen && activePerf ? (
          /* When set timing is over (remaining === 0), live rating goes off ──────────── */
          remaining === 0 ? (
            <div
              className="rounded-[24px] border-2 border-slate-300 p-6 sm:p-8 text-center space-y-4 shadow-lg"
              style={{ background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)" }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 shadow-sm">
                <span className="text-3xl">⏱️</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-800">Rating Window Closed</h2>
                <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                  {existingVote !== null || justVoted
                    ? `Your ${existingVote ?? selectedRating}★ rating has been secured! Time is up for ${activePerf.name}. Admin is finalizing scores.`
                    : `Time is up for ${activePerf.name}. The live rating window has closed and results are being tallied.`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                <span>Waiting for admin to finalize & start next act…</span>
              </div>
            </div>
          ) :
          isStudentDeptBlocked ? (
            /* ── DEPARTMENT RATING BLOCK BANNER ─────────────────────────── */
            <div
              className="rounded-[24px] border-2 border-amber-300 p-6 sm:p-8 text-center space-y-4 shadow-lg"
              style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)" }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-4xl shadow-sm">
                🚫
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-amber-900">
                  {activePerfDept?.name ?? "Your Department"} is Blocked from Rating
                </h2>
                <p className="text-sm font-medium text-amber-800 max-w-xs mx-auto leading-relaxed">
                  Students from the <strong>{activePerfDept?.name ?? "performing"} Department</strong> cannot rate their own act.
                  Rating &amp; liking is open for all other departments!
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-amber-700 font-medium">
                <i className="bi bi-clock-fill text-xs" />
                <span>Waiting for the next performance…</span>
              </div>
            </div>
          ) : (
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
                <i className="bi bi-stopwatch text-purple-600 text-sm" />
                <span className="font-mono text-base sm:text-lg font-black tabular-nums text-purple-900">
                  {mins}:{secs}
                </span>
              </div>
            </div>

            {/* Performance Headline with Image Cover */}
            <div className="space-y-4 text-center sm:text-left">
              <div className="relative aspect-16/9 sm:aspect-21/9 max-h-64 w-full overflow-hidden rounded-2xl border border-purple-200 shadow-md">
                <img
                  src={getPerformanceImage(activePerf, activePerfCat)}
                  alt={activePerf.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20" />

                {/* Department badge overlay on top left */}
                {activePerfDept && (
                  <div className="absolute top-3 left-3">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-black text-white shadow-md backdrop-blur-xs"
                      style={{ backgroundColor: activePerfDept.color }}
                    >
                      {activePerfDept.name} ({activePerfDept.shortName})
                    </span>
                  </div>
                )}

                {/* Bottom category and participants on image */}
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
                  {activePerfCat && (
                    <span className="rounded-lg bg-white/95 backdrop-blur-xs px-2.5 py-1 text-xs font-extrabold text-slate-800 shadow-xs">
                      {activePerfCat.name}
                    </span>
                  )}
                  {activePerf.participants && (
                    <div className="text-white flex items-center gap-1.5 text-xs font-bold bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                      <i className="bi bi-people-fill text-xs" />
                      <span>{activePerf.participants}</span>
                    </div>
                  )}
                </div>
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
                <i className="bi bi-exclamation-triangle-fill text-red-600 text-sm shrink-0" />
                <span>{voteError}</span>
              </div>
            )}

            {/* Rating Submitted Confirmed State */}
            {existingVote !== null || justVoted ? (
              <div className="rounded-2xl p-6 text-center space-y-3 bg-red-50 border border-red-200 shadow-sm animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
                  <i className="bi bi-heart-fill text-white text-3xl" />
                </div>
                <h3 className="text-xl font-bold text-red-950">
                  Rating &amp; Likes Secured!
                </h3>
                <p className="text-sm font-medium text-red-900">
                  You awarded <strong>{existingVote ?? selectedRating} Likes &amp; Stars ({((existingVote ?? selectedRating) * 20)}%)</strong> to this act.
                </p>
                <div className="flex justify-center gap-1.5 text-red-600 py-1">
                  {[1, 2, 3, 4, 5].map((heart) => (
                    <i
                      key={heart}
                      className={
                        heart <= (existingVote ?? selectedRating)
                          ? "bi bi-heart-fill text-2xl text-red-600 scale-110 drop-shadow-xs transition-all"
                          : "bi bi-heart text-2xl text-slate-300"
                      }
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  Tamper-proof cryptographic record verified. Sit back and await the next performance!
                </p>
                <div className="pt-2">
                  <Link
                    href="/student/dashboard"
                    className="tap-scale inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                  >
                    <i className="bi bi-arrow-left text-purple-600 text-xs" />
                    <span>Back to Dashboard</span>
                  </Link>
                </div>
              </div>
            ) : remaining === 0 ? (
              /* Review Timer Expired State — Review Window Stopped */
              <div className="rounded-3xl p-8 text-center space-y-4 bg-white border border-slate-200 shadow-md animate-fade-in">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-xs">
                  <i className="bi bi-clock-history text-3xl" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Rating Window Closed
                  </h3>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                    The review timer for this performance has ended. Ratings are now locked and being tabulated by stage organizers.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/student/dashboard"
                    className="tap-scale inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    <i className="bi bi-arrow-left text-purple-600 text-xs" />
                    <span>Return to Student Dashboard</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Interactive Star Selector & Submit CTA */
              <div className="space-y-5 rounded-2xl bg-white p-5 sm:p-6 border border-red-100 shadow-sm text-center">
                <p className="text-sm sm:text-base font-bold text-slate-800">
                  Rate &amp; like this performance:
                </p>

                {/* React Bits PeekRating Component — Heart / Likes Shape */}
                <div className="flex flex-col items-center justify-center py-2">
                  <PeekRating
                    value={selectedRating}
                    defaultValue={0}
                    count={5}
                    shape="heart"
                    labels={["Poor (20%)", "Fair (40%)", "Good (60%)", "Great (80%)", "Superb (100%)"]}
                    activeColor="#ef310b"
                    idleColor="#52525b"
                    tipColor="#27272a"
                    tipTextColor="#f5f5f5"
                    size={36}
                    lift={7}
                    magnify={1.15}
                    riseDuration={320}
                    popScale={1.3}
                    showTip
                    allowClear={false}
                    onChange={(val) => {
                      setSelectedRating(val);
                      setVoteError(null);
                    }}
                    onPreview={(val) => setHoveredRating(val)}
                  />
                </div>

                {/* Star / Likes Description Badge */}
                <div className="h-7 flex items-center justify-center">
                  {effectiveRating > 0 ? (
                    <span className="inline-block text-xs sm:text-sm font-extrabold text-red-700 bg-red-50 px-3.5 py-1 rounded-full border border-red-200/60 shadow-xs">
                      {RATING_DESCRIPTIONS[effectiveRating]}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 bg-slate-100 px-3.5 py-1 rounded-full border border-slate-200">
                      <i className="bi bi-hand-index-thumb text-purple-600 text-xs animate-bounce" />
                      Tap hearts above to select your rating
                    </span>
                  )}
                </div>

                {/* Submit Rating CTA Button */}
                <button
                  type="button"
                  onClick={handleVote}
                  disabled={submitting || remaining === 0 || selectedRating === 0}
                  className="tap-scale w-full rounded-2xl px-6 py-4 text-base sm:text-lg font-extrabold text-white shadow-lg transition-all hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background:
                      selectedRating === 0 || remaining === 0
                        ? "#94A3B8"
                        : "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
                    minHeight: "52px",
                  }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Securing Your Rating…
                    </span>
                  ) : remaining === 0 ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="bi bi-clock-fill text-base" />
                      Rating Window Closed
                    </span>
                  ) : selectedRating === 0 ? (
                    <span className="flex items-center justify-center gap-2 text-slate-100">
                      <i className="bi bi-heart text-base" />
                      Select 1 to 5 Hearts to Rate
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <i className="bi bi-heart-fill text-white text-base animate-pulse" />
                      Submit {selectedRating} Likes &amp; Rating ({selectedRating * 20}%)
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
          )
        ) : (
          /* ── FEATURED UPCOMING / STAGE STANDBY CARD ── */
          upcomingPerf ? (
            <div className="overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-xl transition-all">
              {/* Card Cover Image Banner */}
              <div className="relative aspect-16/9 sm:aspect-21/9 max-h-72 w-full overflow-hidden bg-slate-100">
                <img
                  src={getPerformanceImage(upcomingPerf, upcomingCat)}
                  alt={upcomingPerf.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                {/* Top-left department badge */}
                {upcomingDept && (
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-black text-white shadow-md backdrop-blur-xs"
                      style={{ backgroundColor: upcomingDept.color }}
                    >
                      {upcomingDept.name} ({upcomingDept.shortName})
                    </span>
                  </div>
                )}

                {/* Top-right Standby Pill */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-300 border border-amber-300/30 shadow-md">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    STAGE STANDBY · UPCOMING ACT
                  </span>
                </div>

                {/* Bottom Category and Participants on Image */}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 right-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {upcomingCat && (
                      <span className="rounded-lg bg-white/95 backdrop-blur-xs px-2.5 py-1 text-xs font-extrabold text-slate-800 shadow-xs">
                        {upcomingCat.name}
                      </span>
                    )}
                    {upcomingPerf.participants && (
                      <span className="rounded-lg bg-black/60 backdrop-blur-xs px-2.5 py-1 text-xs font-semibold text-white flex items-center gap-1">
                        <i className="bi bi-people-fill text-xs" />
                        <span>{upcomingPerf.participants}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {upcomingPerf.name}
                  </h2>
                  {upcomingPerf.description && (
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {upcomingPerf.description}
                    </p>
                  )}
                </div>

                {/* Standby announcement notice */}
                <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                    <i className="bi bi-broadcast text-lg animate-pulse" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-bold text-purple-950">
                      Rating &amp; Likes will open when act goes live
                    </h4>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Keep this page open! When the stage organizers trigger this performance from the admin console, your live heart &amp; star rating arena will automatically appear here.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live WebSocket Connected · Standing by</span>
                  </div>
                  <Link
                    href="/student/dashboard"
                    className="tap-scale inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                  >
                    <i className="bi bi-arrow-left text-xs" />
                    <span>Return to Dashboard</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-3xl p-8 text-center space-y-4 bg-white border border-slate-200 shadow-md"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-purple-600 shadow-xs">
                <i className="bi bi-music-note-beamed text-3xl" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-900">
                  Rating is currently closed
                </h2>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Keep this page open — live star rating and liking begins when stage organizers schedule and launch acts.
                </p>
              </div>
              <div>
                <Link
                  href="/student/dashboard"
                  className="tap-scale inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition"
                >
                  <i className="bi bi-arrow-left text-purple-600 text-xs" />
                  <span>Return to Student Dashboard</span>
                </Link>
              </div>
            </div>
          )
        )}

        {/* Festival lineup with cards and images */}
        <div
          className="rounded-3xl p-5 sm:p-6 bg-white border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold flex items-center gap-2 text-slate-900">
              <i className="bi bi-music-note-beamed text-purple-600" aria-hidden="true" />
              Festival Lineup
            </h2>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
              {performances.length} {performances.length === 1 ? "Performance" : "Performances"}
            </span>
          </div>

          {perfsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : performances.length === 0 ? (
            <EmptyState
              title="No performances scheduled yet"
              description="The lineup will appear here once stage organizers schedule acts."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {performances.map((perf, index) => {
                const pDept = deptMap[perf.departmentId];
                const pCat = catMap[perf.categoryId];
                const isCurrent = perf.id === activePerfId && isOpen;
                const isCompleted = perf.status === "completed";
                const imgUrl = getPerformanceImage(perf, pCat);

                return (
                  <div
                    key={perf.id}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xs transition-all hover:shadow-md ${
                      isCurrent
                        ? "ring-2 ring-purple-500 border-purple-400"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Card Cover Image Banner */}
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                      <img
                        src={imgUrl}
                        alt={perf.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                      {/* Department badge */}
                      {pDept && (
                        <div className="absolute top-2.5 left-2.5">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm"
                            style={{ backgroundColor: pDept.color }}
                          >
                            {pDept.shortName}
                          </span>
                        </div>
                      )}

                      {/* Status badge */}
                      <div className="absolute top-2.5 right-2.5">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            LIVE NOW
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            <i className="bi bi-star-fill text-[10px] text-amber-300" />
                            {perf.averageRating ? perf.averageRating.toFixed(1) : "0"}★ ({perf.percentageScore ? `${perf.percentageScore.toFixed(0)}%` : "0%"})
                          </span>
                        ) : (
                          <span className="rounded-full bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-slate-200">
                            #{index + 1} Scheduled
                          </span>
                        )}
                      </div>

                      {/* Category pill */}
                      {pCat && (
                        <div className="absolute bottom-2 left-2.5">
                          <span className="rounded-md bg-white/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-slate-800">
                            {pCat.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col p-4 space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1">
                        {perf.name}
                      </h4>
                      {perf.participants ? (
                        <p className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                          <i className="bi bi-people-fill text-xs shrink-0" />
                          <span className="truncate">{perf.participants}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">{pDept?.name ?? "Department Act"}</p>
                      )}

                      {perf.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-1">
                          {perf.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
