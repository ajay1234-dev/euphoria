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

import { useCountdown } from "@/hooks/useCountdown";

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
  const hasActiveTickRef = useRef(false);
  const autoStoppedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      hasActiveTickRef.current = false;
      autoStoppedRef.current = null;
    }
  }, [isOpen, activeId]);

  useEffect(() => {
    if (isOpen && remaining > 0) {
      hasActiveTickRef.current = true;
    }
  }, [isOpen, remaining]);

  useEffect(() => {
    if (!isOpen || !eventId || !activeId || !endsAtMs) return;
    if (remaining > 0) return;
    if (!hasActiveTickRef.current) return;
    const serverNow = Date.now() + serverOffsetMs;
    if (serverNow < endsAtMs) return;
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
  }, [isOpen, eventId, activeId, remaining, endsAtMs, serverOffsetMs]);

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
    <div className="min-h-dvh flex flex-col justify-between bg-gradient-to-b from-[#0B0730] to-[#1F1150] text-white selection:bg-[#F2960B]/30 selection:text-white overflow-hidden relative font-sans">
      {/* Department Ambient Glow for high-contrast auditorium projection */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-1000"
        style={{
          background: activeDept
            ? `radial-gradient(circle at 50% 40%, ${activeDept.color}35 0%, transparent 70%)`
            : isOpen
            ? "radial-gradient(circle at 50% 40%, rgba(242, 150, 11, 0.15) 0%, transparent 70%)"
            : "radial-gradient(circle at 50% 40%, rgba(124, 58, 237, 0.1) 0%, transparent 70%)",
        }}
      />

      {/* Floating Projector Header (Auditorium Stage Dark Theme) */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-4 bg-black/40 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-[#FFC94A]">
            <i className="bi bi-broadcast text-lg animate-pulse" />
          </div>
          <div>
            <span className="font-heading text-xl sm:text-2xl tracking-wide uppercase text-white">
              {config?.festName ?? "Euphoria 2026"}
            </span>
            <span className="hidden sm:inline text-xs text-white/60 ml-2 font-semibold tracking-wider uppercase">
              · Stage Confidence Monitor
            </span>
          </div>
        </div>

        {/* Projector Controls */}
        <div className="flex items-center gap-3">
          <Link
            href="/projector/results"
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition active:scale-95 shadow-sm backdrop-blur-xs"
            title="Switch to Results Podium"
          >
            <i className="bi bi-trophy-fill text-[#FFC94A] text-sm" />
            <span>Results Podium ↗</span>
          </Link>

          <button
            onClick={toggleFullscreen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition active:scale-95 shadow-sm cursor-pointer"
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
            <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 backdrop-blur-md px-5 py-2 text-xs sm:text-sm font-bold text-emerald-300 shadow-lg">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="tracking-widest uppercase">Live Audience Rating Open</span>
            </div>

            {/* Performance Title & Department Metadata */}
            <div className="space-y-3 max-w-4xl px-4">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {activeDept && (
                  <span
                    className="rounded-full px-5 py-1.5 text-xs sm:text-sm font-bold shadow-md text-white border border-white/20"
                    style={{ backgroundColor: activeDept.color }}
                  >
                    {activeDept.name} ({activeDept.shortName})
                  </span>
                )}
                {activeCat && (
                  <span className="rounded-full bg-white/15 border border-white/20 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white/90 backdrop-blur-xs">
                    {activeCat.name}
                  </span>
                )}
              </div>

              <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white drop-shadow-md">
                {activePerf?.name ?? "Live Act"}
              </h1>

              {activePerf?.description && (
                <p className="text-sm sm:text-lg text-white/80 max-w-2xl mx-auto font-medium line-clamp-2">
                  {activePerf.description}
                </p>
              )}
            </div>

            {/* Giant Auditorium Countdown Clock */}
            <div className="py-2 flex flex-col items-center">
              <div
                className={`rounded-3xl border-2 px-8 sm:px-20 py-4 sm:py-6 shadow-2xl backdrop-blur-md transition-all duration-300 ${
                  remaining <= 10 && remaining > 0
                    ? "border-red-500/80 bg-red-950/40 timer-critical-pulse"
                    : "border-white/15 bg-black/40"
                }`}
              >
                <div
                  className={`font-heading text-8xl sm:text-9xl md:text-[140px] lg:text-[180px] xl:text-[210px] tabular-nums tracking-normal leading-none select-none ${
                    remaining <= 10 && remaining > 0
                      ? "text-red-400 drop-shadow-[0_0_35px_rgba(239,68,68,0.7)]"
                      : "text-white drop-shadow-[0_0_30px_rgba(255,201,74,0.4)]"
                  }`}
                >
                  {mins}:{secs}
                </div>
              </div>

              {remaining === 0 && (
                <div className="mt-4 text-base sm:text-xl font-heading tracking-wide uppercase text-[#FFC94A] animate-pulse">
                  Rating Window Closed · Tabulating Audience Scores…
                </div>
              )}
            </div>

            {/* Live Audience Engagement Metrics */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white/10 border border-white/15 px-6 py-3 text-base sm:text-lg font-bold text-white shadow-md backdrop-blur-md">
                <i className="bi bi-people-fill text-[#FFC94A] text-xl" />
                <span className="tabular-nums font-mono">{liveVotes}</span>
                <span>Ratings Recorded</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── STANDBY / IDLE STATE (Between acts) ── */
          <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-3xl animate-fade-in py-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 border border-white/20 text-[#FFC94A] shadow-xl backdrop-blur-md">
              <i className="bi bi-stars text-3xl animate-spin-slow" />
            </div>

            <div className="space-y-3">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#FFC94A]">
                Cultural Stage Confidence Monitor
              </span>
              <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-wide">
                {config?.festName ?? "Euphoria 2026"}
              </h1>
              <p className="text-base sm:text-xl text-white/80 font-medium max-w-xl mx-auto">
                Stage ready · Waiting for console administrator to launch the next act.
              </p>
            </div>

            {/* Upcoming Schedule Teaser for the Audience */}
            {upcomingActs.length > 0 && (
              <div className="w-full max-w-md rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md p-5 text-left shadow-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white/70 uppercase tracking-wider">
                  <span>Up Next on Stage</span>
                  <span className="text-[#FFC94A]">{upcomingActs.length} Scheduled Acts</span>
                </div>
                <div className="space-y-2">
                  {upcomingActs.slice(0, 3).map((act, index) => {
                    const dept = act.departmentId ? deptMap[act.departmentId] : null;
                    return (
                      <div
                        key={act.id}
                        className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FFC94A]/20 border border-[#FFC94A]/40 text-xs font-heading font-bold text-[#FFC94A]">
                            {index + 1}
                          </span>
                          <span className="text-sm font-bold text-white truncate">{act.name}</span>
                        </div>
                        {dept && (
                          <span
                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white shrink-0 ml-2"
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
      <footer className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-3 border-t border-white/10 text-[11px] text-white/50 bg-black/30 backdrop-blur-md">
        <span>Auditorium Projector Feed · Controlled by Admin Console</span>
        <span>Meenakshi Sundararajan Engineering College</span>
      </footer>
    </div>
  );
}
