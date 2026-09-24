"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig, useActiveEvent, useDepartments, useCategories, usePerformances } from "@/hooks/useData";
import { useVotingState } from "@/hooks/useVotingState";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TestModeBanner } from "@/components/common/TestModeBanner";
import { DepartmentChip } from "@/components/common/DepartmentChip";
import { EmptyState } from "@/components/common/EmptyState";
import { FestBackground } from "@/components/common/FestBackground";
import { formatDate } from "@/lib/utils";
import {
  formatYearLabel,
  OFFICIAL_DEPARTMENTS_LIST,
  SHORT_CODE_TO_DEPT_CODE,
  DEPT_CODE_TO_SHORT_CODE,
} from "@/config/departments";
import { getPerformanceImage } from "@/config/constants";

import { StarRating } from "@/components/ui/StarRating";
import { CheerButton } from "@/components/ui/CheerButton";
import { Star } from "lucide-react";


import { useCountdown } from "@/hooks/useCountdown";

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "20% · Needs Improvement",
  2: "40% · Good Effort",
  3: "60% · Good Performance",
  4: "80% · Excellent Performance",
  5: "100% · Outstanding Champion Performance!",
};

function VoteDashboard() {
  const { profile, config: authConfig, signOutUser } = useAuth();
  const { config: liveAppConfig } = useAppConfig();
  const config = liveAppConfig || authConfig;
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

  // Department mapping — indexes docId, official codes, short codes, and custom colors
  const deptMap = useMemo(() => {
    const map: Record<string, { id: string; name: string; shortName: string; color: string; code?: string }> = {};

    OFFICIAL_DEPARTMENTS_LIST.forEach((d) => {
      const entry = { id: d.code, name: d.name, shortName: d.shortCode, color: d.color, code: d.code };
      map[d.code] = entry;
      map[d.shortCode] = entry;
      map[d.shortCode.toLowerCase()] = entry;
      map[`dept-${d.shortCode.toLowerCase()}`] = entry;
      map[d.name.toLowerCase()] = entry;
    });

    departments.forEach((d) => {
      const short = (d.shortName || (d as unknown as { shortCode?: string }).shortCode || "").trim();
      const sLower = short.toLowerCase();
      const code = (d as unknown as { code?: string }).code || SHORT_CODE_TO_DEPT_CODE[sLower] || "";
      const color = d.color || "#7C3AED";
      const entry = { id: d.id, name: d.name, shortName: short || d.name, color, code };

      map[d.id] = entry;
      if (code) {
        map[code] = entry;
        map[code.toLowerCase()] = entry;
        map[`dept-${code}`] = entry;
        map[`dept-${code.toLowerCase()}`] = entry;
      }
      if (short) {
        map[short] = entry;
        map[sLower] = entry;
        map[`dept-${sLower}`] = entry;
      }
      if (d.name) {
        map[d.name.toLowerCase()] = entry;
      }
    });

    return map;
  }, [departments]);

  // Robust department resolver
  const resolveDept = useCallback(
    (deptId: string | null | undefined, actTitle?: string) => {
      if (!deptId) return null;
      if (deptMap[deptId]) return deptMap[deptId];
      if (deptMap[deptId.toLowerCase()]) return deptMap[deptId.toLowerCase()];

      const lower = deptId.toLowerCase();
      if (SHORT_CODE_TO_DEPT_CODE[lower] && deptMap[SHORT_CODE_TO_DEPT_CODE[lower]]) {
        return deptMap[SHORT_CODE_TO_DEPT_CODE[lower]];
      }
      if (DEPT_CODE_TO_SHORT_CODE[deptId] && deptMap[DEPT_CODE_TO_SHORT_CODE[deptId]]) {
        return deptMap[DEPT_CODE_TO_SHORT_CODE[deptId]];
      }

      if (actTitle) {
        const prefix = (actTitle.split("—")[0] || actTitle.split("-")[0] || "").trim();
        const pLower = prefix.toLowerCase();
        if (prefix && deptMap[prefix]) return deptMap[prefix];
        if (pLower && deptMap[pLower]) return deptMap[pLower];
        if (SHORT_CODE_TO_DEPT_CODE[pLower] && deptMap[SHORT_CODE_TO_DEPT_CODE[pLower]]) {
          return deptMap[SHORT_CODE_TO_DEPT_CODE[pLower]];
        }
      }

      return (
        Object.values(deptMap).find(
          (d) =>
            d.id === deptId ||
            d.shortName.toLowerCase() === lower ||
            d.name.toLowerCase().includes(lower)
        ) || null
      );
    },
    [deptMap]
  );

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const dept = profile?.departmentId ? resolveDept(profile.departmentId) : null;
  const isTestEvent = event?.isTest ?? false;

  const isOpen = votingState?.status === "open";
  const activePerfId = votingState?.activePerformanceId;
  const activePerf = performances.find((p) => p.id === activePerfId);
  const activePerfDept = activePerf ? resolveDept(activePerf.departmentId, activePerf.name) : null;
  const activePerfCat = activePerf?.categoryId ? catMap[activePerf.categoryId] : null;

  // Student's department resolution
  const studentDept = useMemo(() => {
    return (
      resolveDept(profile?.departmentId) ||
      resolveDept(profile?.departmentCode) ||
      resolveDept(profile?.department) ||
      null
    );
  }, [profile, resolveDept]);

  // ── Event Day Gate: when eventOpen is false, show Coming Soon screen ──────
  const isSystemOpen = config?.eventOpen === true;

  // ── Department voting block: student cannot vote for their own dept's act ──
  // Checks departmentId, numeric code (e.g. 205, 104), short code (IT, CSE), and act title prefix
  const isStudentDeptBlocked = useMemo(() => {
    if (!isOpen || !activePerf || (!activePerfDept && !activePerf.departmentId)) return false;

    // 1. Direct ID or Code match
    if (profile?.departmentId && activePerf.departmentId && profile.departmentId === activePerf.departmentId) return true;
    if (profile?.departmentCode && activePerf.departmentId && (profile.departmentCode === activePerf.departmentId || profile.departmentCode.toLowerCase() === activePerf.departmentId.toLowerCase())) return true;

    // 2. Compare resolved department objects
    if (studentDept && activePerfDept) {
      if (studentDept.id === activePerfDept.id) return true;
      if (studentDept.shortName.toLowerCase() === activePerfDept.shortName.toLowerCase()) return true;
      if (studentDept.code && activePerfDept.code && studentDept.code === activePerfDept.code) return true;
      if (studentDept.name.toLowerCase() === activePerfDept.name.toLowerCase()) return true;
    }

    // 3. Compare student properties against act title prefix (e.g. "IT — Dynamic Troupe")
    if (activePerf.name) {
      const prefix = (activePerf.name.split("—")[0] || activePerf.name.split("-")[0] || "").trim().toLowerCase();
      if (prefix) {
        const perfCode = SHORT_CODE_TO_DEPT_CODE[prefix] || prefix;
        const studentCode = profile?.departmentCode?.toLowerCase() || (studentDept?.code ? studentDept.code.toLowerCase() : "");
        const studentShort = profile?.department?.toLowerCase() || (studentDept?.shortName ? studentDept.shortName.toLowerCase() : "");
        if (studentCode && (studentCode === perfCode || studentCode === prefix)) return true;
        if (studentShort && (studentShort === prefix || studentShort === perfCode)) return true;
      }
    }

    return false;
  }, [isOpen, activePerf, activePerfDept, studentDept, profile]);

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

  // Handle vote submission — always through secure server API (Admin SDK)
  const handleVote = async () => {
    if (submitting) return; // Prevent double-tap on mobile touchscreens
    if (!config?.activeEventId || !activePerfId || !profile?.uid) return;
    if (isStudentDeptBlocked) {
      setVoteError("Festival fairness rule: You cannot rate your own department's performance.");
      return;
    }
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      setVoteError("Please tap 1 to 5 stars to select your rating before submitting.");
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
      // Always use the secure server API route (Admin SDK bypasses Firestore rule edge cases)
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setVoteError("Session expired. Please sign in again.");
        return;
      }

      const res = await fetch("/api/voting/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          eventId: config.activeEventId,
          performanceId: activePerfId,
          rating: selectedRating,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        // Show user-friendly errors for fairness / closed window
        setVoteError(data.error || "Failed to submit rating. Please try again.");
        return;
      }

      // Vote recorded successfully — show confirmation
      setExistingVote(selectedRating);
      setJustVoted(true);
    } catch (err: unknown) {
      const msg = (err as Error).message || "Network error. Please check your connection and try again.";
      setVoteError(msg);
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
        className="sticky top-0 z-10 flex items-center justify-between px-2.5 sm:px-4 py-2.5 sm:py-3"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Link
            href="/student/dashboard"
            className="tap-scale flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 sm:px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 shadow-xs transition shrink-0"
            title="Back to Student Dashboard"
          >
            <i className="bi bi-arrow-left text-purple-700 text-xs" />
            <span className="font-bold hidden xs:inline">Dashboard</span>
          </Link>
          <span
            className="font-display text-base sm:text-lg md:text-xl uppercase tracking-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none"
            style={{ fontFamily: "var(--font-anton), sans-serif", color: "var(--color-primary)" }}
          >
            {config?.festName ?? "Euphoria 2026"}
          </span>
          <span className="hidden sm:inline text-xs font-semibold text-[#F0E4CE]">·</span>
          <span className="hidden sm:inline text-xs font-semibold text-[#5B5470]">Live Stage Arena</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {dept && (
            <DepartmentChip name={dept.name} shortName={dept.shortName} color={dept.color} />
          )}
          <button
            onClick={signOutUser}
            className="flex items-center gap-1 sm:gap-1.5 rounded-[10px] border border-slate-200 px-2 sm:px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            aria-label="Sign out"
          >
            <i className="bi bi-box-arrow-right text-xs" aria-hidden="true" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── EVENT DAY GATE — full screen Coming Soon when system is closed ── */}
      {!isSystemOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-4 sm:px-6"
          style={{ background: "var(--bg)" }}
        >
          <FestBackground />
          <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-6 max-w-sm w-full">
            {/* Lock icon */}
            <div
              className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full shadow-xl"
              style={{ background: "var(--gradient-hero)" }}
            >
              <i className="bi bi-lock-fill text-white text-4xl sm:text-5xl" />
            </div>
            {/* Title */}
            <div className="space-y-2">
              <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-wider text-[#2C1B6B]">
                {config?.festName ?? "Euphoria 2026"}
              </h1>
              <p className="text-lg sm:text-xl font-bold text-[#1A1230]">
                Rating Opens on Event Day
              </p>
              <p className="text-xs sm:text-sm leading-relaxed text-[#5B5470]">
                The live rating system will be unlocked by the admin on the day of the festival.
                Please check back then — this page will automatically update!
              </p>
            </div>
            {/* Action buttons on lock screen */}
            <div className="flex flex-col items-center gap-3 w-full">
              <Link
                href="/student/dashboard"
                className="tap-scale inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition w-full max-w-xs"
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

      <main id="main-content" className="mx-auto max-w-2xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5" tabIndex={-1}>
        {/* Test mode banner */}
        {isTestEvent && <TestModeBanner />}

        {/* ── LIVE RATING ARENA CARD ────────────────────────────────────────── */}
        {isOpen && activePerf ? (
          <div
            className="relative overflow-hidden rounded-2xl border border-[#F0E4CE] bg-white p-5 sm:p-7 space-y-6 shadow-xs"
          >
            {/* Top status & countdown */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E4CE] pb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCE7F0] border border-[#F9A8D4] px-3.5 py-1 text-xs sm:text-sm font-bold text-[#D6266E]">
                <span className="h-2 w-2 rounded-full bg-[#D6266E] animate-pulse" />
                Live on Stage
              </span>

              {/* Countdown Timer with pulse under 10 seconds */}
              <div
                className={`flex items-center gap-2 rounded-2xl bg-white px-3.5 py-1.5 border border-[#F0E4CE] shadow-xs ${
                  remaining <= 10 && remaining > 0 ? "timer-critical-pulse border-red-300" : ""
                }`}
              >
                <i className="bi bi-stopwatch text-[#F2960B] text-sm" />
                <span className="font-mono text-base sm:text-lg font-black tabular-nums text-[#1C1533]">
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

              <h2 className="font-heading text-2xl sm:text-3xl text-[#2C1B6B] tracking-tight">
                {activePerf.name}
              </h2>
              {activePerf.description && (
                <p className="text-sm text-[#5B5470] leading-relaxed">
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
              <div className="rounded-2xl p-6 text-center space-y-3 bg-[#FEF0D9] border border-[#F2960B]/30 shadow-sm animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F2960B] text-white shadow-md">
                  <Star className="w-8 h-8 fill-white text-white" />
                </div>
                <h3 className="font-heading text-xl text-[#2C1B6B]">
                  Rating Recorded!
                </h3>
                <p className="text-sm font-medium text-[#1A1230]">
                  You awarded <strong>{existingVote ?? selectedRating} Stars ({((existingVote ?? selectedRating) * 20)}%)</strong> to this act.
                </p>
                {/* Frozen recap of their score */}
                <div className="flex justify-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={
                        star <= (existingVote ?? selectedRating)
                          ? "w-6 h-6 fill-[#F2960B] text-[#F2960B] scale-110 drop-shadow-xs transition-all"
                          : "w-6 h-6 text-[#D1C7B7]"
                      }
                    />
                  ))}
                </div>
                <p className="text-xs text-[#5B5470] pt-1">
                  Verified festival entry. Sit back and await the next act on stage!
                </p>
                {/* Cheer button is still accessible to cheer for the act */}
                <div className="pt-2">
                  <CheerButton />
                </div>
                <div className="pt-2">
                  <Link
                    href="/student/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#E8DFC8] px-4 py-2 text-xs font-bold text-[#2C1B6B] shadow-xs hover:bg-[#FFFBF3] transition"
                  >
                    <i className="bi bi-arrow-left text-[#2C1B6B] text-xs" />
                    <span>Back to Dashboard</span>
                  </Link>
                </div>
              </div>
            ) : isStudentDeptBlocked ? (
              /* Fairness Protection Active — Student's Own Department Act */
              <div className="rounded-3xl p-6 sm:p-8 text-center space-y-4 bg-amber-50/90 border border-amber-200/80 shadow-md animate-fade-in">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-[#D48006] shadow-xs ring-4 ring-amber-50">
                  <i className="bi bi-shield-lock-fill text-3xl" />
                </div>
                <div className="space-y-1.5">
                  <span className="inline-block text-xs font-black tracking-wider uppercase text-[#D48006] bg-amber-200/80 px-3 py-1 rounded-full border border-amber-300/80">
                    Festival Fairness Protection
                  </span>
                  <h3 className="font-heading text-xl sm:text-2xl text-[#2C1B6B] pt-1">
                    Your Department Act is on Stage!
                  </h3>
                  <p className="text-sm text-[#1A1230]/90 max-w-md mx-auto leading-relaxed">
                    Voting is locked for your department to keep scores 100% fair. Cheer loud from the crowd!
                  </p>
                </div>
                <div className="pt-2 max-w-xs mx-auto">
                  <CheerButton />
                </div>
                <div className="pt-2">
                  <Link
                    href="/student/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-white border border-amber-200/80 px-4 py-2 text-xs font-bold text-[#2C1B6B] shadow-xs hover:bg-amber-100/50 transition"
                  >
                    <i className="bi bi-arrow-left text-amber-700 text-xs" />
                    <span>Return to Dashboard</span>
                  </Link>
                </div>
              </div>
            ) : remaining === 0 ? (
              /* Review Timer Expired State — Review Window Stopped */
              <div className="rounded-3xl p-8 text-center space-y-4 bg-white border border-[#E8DFC8] shadow-md animate-fade-in">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-[#D48006] shadow-xs">
                  <i className="bi bi-clock-history text-3xl" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-xl sm:text-2xl text-[#2C1B6B]">
                    Rating Window Closed
                  </h3>
                  <p className="text-sm text-[#5B5470] max-w-sm mx-auto leading-relaxed">
                    The timer for this act has ended. Ratings are now locked and being tabulated.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/student/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F4EDE0] hover:bg-[#E8DFC8] px-4 py-2.5 text-xs font-bold text-[#2C1B6B] transition"
                  >
                    <i className="bi bi-arrow-left text-[#2C1B6B] text-xs" />
                    <span>Return to Dashboard</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Interactive Star Selector & Submit CTA + Cheer */
              <div className="space-y-6 rounded-2xl bg-white p-5 sm:p-6 border border-[#F0E4CE] shadow-sm text-center">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1A1230]">
                    Rate this Act
                  </h3>
                  <p className="text-xs text-[#5B5470] mt-0.5">
                    Select 1 to 5 stars, then tap Submit Rating
                  </p>
                </div>

                {/* StarRating Component */}
                <StarRating
                  value={selectedRating}
                  onChange={(val) => {
                    setSelectedRating(val);
                    setVoteError(null);
                  }}
                  disabled={submitting || remaining === 0}
                />

                {/* Submit Rating CTA Button */}
                <button
                  type="button"
                  onClick={handleVote}
                  disabled={submitting || remaining === 0 || selectedRating === 0}
                  className="tap-scale w-full rounded-2xl px-6 py-4 text-base sm:text-lg font-extrabold text-white shadow-lg transition-all hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background:
                      selectedRating === 0 || remaining === 0
                        ? "#94A3B8"
                        : "var(--gradient-hero)",
                    minHeight: "52px",
                  }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Submitting Rating…
                    </span>
                  ) : remaining === 0 ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="bi bi-clock-fill text-base" />
                      Rating Window Closed
                    </span>
                  ) : selectedRating === 0 ? (
                    <span className="flex items-center justify-center gap-2 text-slate-100">
                      <Star className="w-5 h-5 text-white/80" />
                      Tap 1 to 5 Stars Above to Rate
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Star className="w-5 h-5 fill-white text-white" />
                      Submit {selectedRating} Star{selectedRating > 1 ? "s" : ""} ({selectedRating * 20}%)
                    </span>
                  )}
                </button>

                {/* Cheer Section Divider & Cheer Button */}
                <div className="pt-2 border-t border-[#F0E4CE]">
                  <CheerButton />
                </div>
              </div>
            )}
          </div>
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

                {/* Top Badges Bar: Responsive Flex container preventing overlap on any mobile screen */}
                <div className="absolute top-2.5 sm:top-3 inset-x-2.5 sm:inset-x-3 flex items-center justify-between gap-2 pointer-events-none z-10">
                  {upcomingDept ? (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black text-white shadow-md backdrop-blur-xs truncate max-w-[45%] sm:max-w-[50%]"
                      style={{ backgroundColor: upcomingDept.color }}
                      title={`${upcomingDept.name} (${upcomingDept.shortName})`}
                    >
                      {upcomingDept.shortName}
                    </span>
                  ) : <span />}

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1230]/90 backdrop-blur-md px-2.5 py-1 text-[11px] sm:text-xs font-bold text-[#FFC94A] border border-[#FFC94A]/30 shadow-md shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FFC94A] animate-ping" />
                    Up Next on Stage
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
                  <h2 className="font-heading text-2xl sm:text-3xl text-[#2C1B6B] tracking-tight">
                    {upcomingPerf.name}
                  </h2>
                  {upcomingPerf.description && (
                    <p className="text-sm text-[#5B5470] leading-relaxed">
                      {upcomingPerf.description}
                    </p>
                  )}
                </div>

                {/* Standby announcement notice */}
                <div className="rounded-2xl border border-[#F0E4CE] bg-[#FEF0D9]/40 p-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2C1B6B] text-white shadow-xs">
                    <i className="bi bi-broadcast text-lg animate-pulse" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-sm font-bold text-[#2C1B6B]">
                      Rating will open when the act begins
                    </h4>
                    <p className="text-xs text-[#5B5470] leading-relaxed">
                      Keep this page open — your rating stars will appear automatically when the act starts.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F0E4CE]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#5B5470]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Stage Connected · Standing by</span>
                  </div>
                  <Link
                    href="/student/dashboard"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8DFC8] bg-white px-3.5 py-2 text-xs font-bold text-[#2C1B6B] hover:bg-[#FFFBF3] transition"
                  >
                    <i className="bi bi-arrow-left text-xs" />
                    <span>Return to Dashboard</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-3xl p-8 text-center space-y-4 bg-white border border-[#E8DFC8] shadow-md"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF0D9] text-[#F2960B] shadow-xs">
                <i className="bi bi-music-note-beamed text-3xl" />
              </div>
              <div className="space-y-1">
                <h2 className="font-heading text-2xl text-[#2C1B6B]">
                  Rating is currently closed
                </h2>
                <p className="text-sm text-[#5B5470] max-w-sm mx-auto">
                  Voting opens as soon as the first act starts — keep this page open.
                </p>
              </div>
              <div>
                <Link
                  href="/student/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#F4EDE0] hover:bg-[#E8DFC8] px-4 py-2 text-xs font-bold text-[#2C1B6B] transition"
                >
                  <i className="bi bi-arrow-left text-[#2C1B6B] text-xs" />
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
              description="The lineup will appear here once acts are scheduled in the festival console."
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
                        ? "ring-2 ring-[#F2960B] border-[#F2960B]"
                        : "border-[#E8DFC8]"
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            ON STAGE
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1230]/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-[#FFC94A]">
                            <i className="bi bi-star-fill text-[10px] text-[#FFC94A]" />
                            {perf.averageRating ? perf.averageRating.toFixed(1) : "0"}★ ({perf.percentageScore ? `${perf.percentageScore.toFixed(0)}%` : "0%"})
                          </span>
                        ) : (
                          <span className="rounded-full bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-slate-200">
                            Act #{index + 1}
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
                      <h4 className="font-heading font-extrabold text-[#2C1B6B] text-base leading-snug line-clamp-1">
                        {perf.name}
                      </h4>
                      {perf.participants ? (
                        <p className="text-xs font-semibold text-[#D6266E] flex items-center gap-1">
                          <i className="bi bi-people-fill text-xs shrink-0" />
                          <span className="truncate">{perf.participants}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-[#5B5470]">{pDept?.name ?? "Department Act"}</p>
                      )}

                      {perf.description && (
                        <p className="text-xs text-[#5B5470] line-clamp-2 leading-relaxed pt-1">
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
