"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig, usePerformances, useDepartments, useCategories } from "@/hooks/useData";
import { useVotingState } from "@/hooks/useVotingState";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { stopPerformanceVoting } from "@/lib/admin/stage";
import type { Performance } from "@/types/firestore";

interface PerfWithId extends Performance {
  id: string;
  voteCount?: number;
  ratingSum?: number;
}

// ── Countdown hook (uses server offset) ─────────────────────────────────────────
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

export default function StageTimerProjectorPage() {
  const { status } = useAuth();
  const { config, loading: configLoading } = useAppConfig();
  const eventId = config?.activeEventId ?? null;
  const { performances: rawPerfs, loading: perfsLoading } = usePerformances(eventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();
  const { votingState, serverOffsetMs } = useVotingState(eventId);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liveVotes, setLiveVotes] = useState(0);

  const performances = rawPerfs as PerfWithId[];
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const isOpen = votingState?.status === "open";
  const activeId = votingState?.activePerformanceId ?? null;
  const activePerf = performances.find((p) => p.id === activeId);

  const endsAtMs = votingState?.votingEndsAt ? votingState.votingEndsAt.toMillis() : null;
  const remaining = useCountdown(isOpen ? endsAtMs : null, serverOffsetMs);

  // Auto-stop voting when timer expires if user has admin credentials
  const autoStoppedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !eventId || !activeId || remaining > 0 || !endsAtMs) return;
    if (autoStoppedRef.current === activeId) return;
    autoStoppedRef.current = activeId;

    const autoStop = async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken(true);
        if (!idToken) return;
        await stopPerformanceVoting(eventId, activeId, idToken);
      } catch (err) {
        console.error("[projector/timer] Auto-stop error:", err);
      }
    };
    autoStop();
  }, [isOpen, eventId, activeId, remaining, endsAtMs]);

  // Scheduled acts upcoming
  const upcomingActs = performances.filter((p) => p.status === "scheduled");

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Real-time live vote count via onSnapshot when voting is active
  useEffect(() => {
    if (!isOpen || !eventId || !activeId) {
      setLiveVotes(0);
      return;
    }
    const votesCol = collection(db, "events", eventId, "performances", activeId, "votes");
    const unsub = onSnapshot(
      votesCol,
      (snap) => {
        setLiveVotes(snap.size);
      },
      () => {
        // silent fallback
      }
    );
    return () => unsub();
  }, [isOpen, eventId, activeId]);

  if (configLoading || perfsLoading) return <PageSkeleton />;

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  const activeDept = activePerf?.departmentId ? deptMap[activePerf.departmentId] : null;
  const activeCat = activePerf?.categoryId ? catMap[activePerf.categoryId] : null;

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-white text-slate-900 selection:bg-purple-100 selection:text-purple-900 overflow-hidden relative font-sans">
      {/* Subtle ambient background glow for high-contrast auditorium projection */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          background: isOpen
            ? "radial-gradient(circle at 50% 35%, rgba(124, 58, 237, 0.08) 0%, transparent 65%)"
            : "radial-gradient(circle at 50% 35%, rgba(245, 158, 11, 0.06) 0%, transparent 65%)",
        }}
      />

      {/* Floating Projector Header (Clean White Auditorium Theme) */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 border border-purple-200 text-purple-600">
            <i className="bi bi-broadcast text-lg animate-pulse" />
          </div>
          <div>
            <span
              className="text-base sm:text-lg font-black tracking-tight text-slate-900"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              {config?.festName ?? "Euphoria 2026"}
            </span>
            <span className="hidden sm:inline text-xs text-slate-500 ml-2 font-semibold tracking-wide uppercase">
              · Stage Timer Projector
            </span>
          </div>
        </div>

        {/* Projector Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/projector/results"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 transition active:scale-95 shadow-xs"
            title="Switch to Results Bar Chart view"
          >
            <i className="bi bi-bar-chart-fill text-purple-600 text-sm" />
            <span>Results Bar Chart ↗</span>
          </Link>

          <button
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95 shadow-xs"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            <i className={isFullscreen ? "bi bi-fullscreen-exit text-sm" : "bi bi-fullscreen text-sm"} />
          </button>
        </div>
      </header>

      {/* Main Projector Arena */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 text-center max-w-6xl mx-auto w-full">
        {isOpen ? (
          /* ── ACTIVE LIVE RATING DISPLAY ── */
          <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-8 w-full animate-fade-in">
            {/* Live Rating Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-5 py-2 text-xs sm:text-sm font-black text-emerald-700 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="tracking-widest uppercase">Live Audience Rating &amp; Likes Open</span>
            </div>

            {/* Performance Title & Department Metadata */}
            <div className="space-y-3 max-w-4xl px-4">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {activeDept && (
                  <span
                    className="rounded-full px-4 py-1 text-xs sm:text-sm font-bold shadow-sm text-white"
                    style={{ backgroundColor: activeDept.color }}
                  >
                    {activeDept.name} ({activeDept.shortName})
                  </span>
                )}
                {activeCat && (
                  <span className="rounded-full bg-purple-50 border border-purple-200 px-3.5 py-1 text-xs sm:text-sm font-semibold text-purple-700">
                    {activeCat.name}
                  </span>
                )}
              </div>

              <h1
                className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 drop-shadow-xs"
                style={{ fontFamily: "var(--font-bricolage)" }}
              >
                {activePerf?.name ?? "Live Act"}
              </h1>

              {activePerf?.description && (
                <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium line-clamp-2">
                  {activePerf.description}
                </p>
              )}
            </div>

            {/* Giant Auditorium Countdown Clock */}
            <div className="py-2 flex flex-col items-center">
              <div className="rounded-3xl border-2 border-slate-200 bg-white shadow-2xl px-8 sm:px-16 py-4 sm:py-6">
                <div
                  className="font-mono text-7xl xs:text-8xl sm:text-9xl md:text-[130px] lg:text-[170px] font-black tabular-nums tracking-tighter transition-all duration-300"
                  style={{
                    color: remaining > 10 ? "#0F172A" : "#DC2626",
                    textShadow:
                      remaining > 10
                        ? "0 2px 20px rgba(124, 58, 237, 0.12)"
                        : "0 2px 25px rgba(220, 38, 38, 0.25)",
                  }}
                >
                  {mins}:{secs}
                </div>
              </div>

              {remaining === 0 && (
                <div className="mt-4 text-sm sm:text-lg font-bold text-amber-600 animate-pulse tracking-wide uppercase">
                  Rating Closed · Finalizing audience tally…
                </div>
              )}
            </div>

            {/* Live Audience Engagement Metrics */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <div className="inline-flex items-center gap-2.5 rounded-2xl bg-slate-50 border border-slate-200 px-6 py-3 text-base sm:text-lg font-extrabold text-slate-800 shadow-sm">
                <i className="bi bi-people-fill text-purple-600 text-lg" />
                <span>{liveVotes} Live Ratings &amp; Likes Cast</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── STANDBY / IDLE STATE (Between acts) ── */
          <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-3xl animate-fade-in py-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 shadow-lg">
              <i className="bi bi-stars text-3xl animate-spin-slow" />
            </div>

            <div className="space-y-3">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-purple-600">
                Live Cultural Festival Stage
              </span>
              <h1
                className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight"
                style={{ fontFamily: "var(--font-bricolage)" }}
              >
                {config?.festName ?? "Euphoria 2026"}
              </h1>
              <p className="text-base sm:text-xl text-slate-600 font-medium max-w-xl mx-auto">
                Stage ready · Waiting for administrator to start the next performance rating window.
              </p>
            </div>

            {/* Upcoming Schedule Teaser for the Audience */}
            {upcomingActs.length > 0 && (
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-lg space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Up Next on Stage</span>
                  <span className="text-purple-600">{upcomingActs.length} Scheduled Acts</span>
                </div>
                <div className="space-y-2">
                  {upcomingActs.slice(0, 3).map((act, index) => {
                    const dept = act.departmentId ? deptMap[act.departmentId] : null;
                    return (
                      <div
                        key={act.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
                            {index + 1}
                          </span>
                          <span className="text-sm font-bold text-slate-900 truncate">{act.name}</span>
                        </div>
                        {dept && (
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white shrink-0 ml-2"
                            style={{ backgroundColor: dept.color }}
                          >
                            {dept.shortName}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Subtle Projector Footer */}
      <footer className="relative z-20 flex items-center justify-between px-6 py-3 border-t border-slate-200 text-[11px] text-slate-400 bg-white/80">
        <span>Auditorium Projector Feed · Controlled by Admin Console</span>
        <span>Meenakshi Sundararajan Engineering College</span>
      </footer>
    </div>
  );
}
