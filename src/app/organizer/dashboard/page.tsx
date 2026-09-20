"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig, usePerformances, useDepartments, useCategories } from "@/hooks/useData";
import { useVotingState } from "@/hooks/useVotingState";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import {
  Timer,
  BarChart3,
  LogOut,
  Maximize2,
  Minimize2,
  Users,
  Star,
  Music,
  Sparkles,
  Radio,
  Clock,
  ChevronRight,
} from "lucide-react";
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

export default function OrganizerDashboardPage() {
  const { status } = useAuth();
  const { config } = useAppConfig();
  const router = useRouter();
  const eventId = config?.activeEventId ?? null;
  const { performances: rawPerfs, loading: perfsLoading } = usePerformances(eventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();
  const { votingState, serverOffsetMs } = useVotingState(eventId);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liveVotes, setLiveVotes] = useState(0);
  const [liveAvg, setLiveAvg] = useState(0);

  const performances = rawPerfs as PerfWithId[];
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const isOpen = votingState?.status === "open";
  const activeId = votingState?.activePerformanceId ?? null;
  const activePerf = performances.find((p) => p.id === activeId);

  const endsAtMs = votingState?.votingEndsAt ? votingState.votingEndsAt.toMillis() : null;
  const remaining = useCountdown(isOpen ? endsAtMs : null, serverOffsetMs);

  // Scheduled acts upcoming
  const upcomingActs = performances.filter((p) => p.status === "scheduled");

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    router.replace("/");
  }, [router]);

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
      setLiveAvg(0);
      return;
    }
    const votesCol = collection(db, "events", eventId, "performances", activeId, "votes");
    const unsub = onSnapshot(
      votesCol,
      (snap) => {
        let totalPoints = 0;
        snap.forEach((doc) => {
          const r = (doc.data().rating as number) ?? 0;
          if (r >= 1 && r <= 5) totalPoints += r;
        });
        const total = snap.size;
        setLiveVotes(total);
        setLiveAvg(total > 0 ? totalPoints / total : 0);
      },
      () => {
        // silent fallback — no permission to list votes
      }
    );
    return () => unsub();
  }, [isOpen, eventId, activeId]);


  useEffect(() => {
    if (status === "loading") return;
    if (status !== "admin" && status !== "organizer") router.replace("/organizer/login");
  }, [status, router]);

  if (status === "loading" || perfsLoading) return <PageSkeleton />;
  if (status !== "admin" && status !== "organizer") return null;

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  const activeDept = activePerf?.departmentId ? deptMap[activePerf.departmentId] : null;
  const activeCat = activePerf?.categoryId ? catMap[activePerf.categoryId] : null;

  return (
    <div
      className="min-h-dvh flex flex-col justify-between text-white selection:bg-purple-500 selection:text-white overflow-hidden relative"
      style={{
        background: "linear-gradient(180deg, #07060F 0%, #0E0A1E 50%, #080612 100%)",
      }}
    >
      {/* Ambient background glow for auditorium projection */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{
          background: isOpen
            ? "radial-gradient(circle at 50% 35%, rgba(124, 58, 237, 0.35) 0%, transparent 65%)"
            : "radial-gradient(circle at 50% 35%, rgba(217, 119, 6, 0.2) 0%, transparent 65%)",
        }}
      />

      {/* Floating Projector Header (Clean, Minimal, Non-Intrusive) */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 backdrop-blur-xs border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-amber-300">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span
              className="text-base sm:text-lg font-black tracking-tight"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              {config?.festName ?? "Euphoria 2026"}
            </span>
            <span className="hidden sm:inline text-xs text-white/50 ml-2 font-medium tracking-wide uppercase">
              · Stage Projector Display 1
            </span>
          </div>
        </div>

        {/* Projector Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/organizer/results"
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition active:scale-95 shadow-sm"
            title="Switch to Results Bar Chart view"
          >
            <BarChart3 className="h-4 w-4 text-amber-300" />
            <span>Results Bar Chart ↗</span>
          </Link>

          <button
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <button
            onClick={handleSignOut}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-red-400 hover:bg-white/10 transition"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Projector Arena */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 text-center max-w-6xl mx-auto w-full">
        {isOpen ? (
          /* ── ACTIVE LIVE VOTING DISPLAY ── */
          <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-8 w-full animate-fade-in">
            {/* Live Voting Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-5 py-2 text-xs sm:text-sm font-black text-emerald-300 backdrop-blur-md shadow-lg shadow-emerald-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="tracking-widest uppercase">Live Audience Voting Open</span>
            </div>

            {/* Performance Title & Department Metadata */}
            <div className="space-y-3 max-w-4xl px-4">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {activeDept && (
                  <span
                    className="rounded-full px-4 py-1 text-xs sm:text-sm font-bold shadow-md text-white"
                    style={{ backgroundColor: activeDept.color }}
                  >
                    {activeDept.name} ({activeDept.shortName})
                  </span>
                )}
                {activeCat && (
                  <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-3.5 py-1 text-xs sm:text-sm font-semibold text-purple-200">
                    {activeCat.name}
                  </span>
                )}
              </div>

              <h1
                className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-lg"
                style={{ fontFamily: "var(--font-bricolage)" }}
              >
                {activePerf?.name ?? "Live Act"}
              </h1>

              {activePerf?.description && (
                <p className="text-sm sm:text-lg text-white/70 max-w-2xl mx-auto font-medium line-clamp-2">
                  {activePerf.description}
                </p>
              )}
            </div>

            {/* Giant Auditorium Countdown Clock */}
            <div className="py-2 flex flex-col items-center">
              <div
                className="font-mono text-7xl xs:text-8xl sm:text-9xl md:text-[140px] lg:text-[180px] font-black tabular-nums tracking-tighter transition-all duration-300 drop-shadow-2xl"
                style={{
                  color: remaining > 10 ? "#FFFFFF" : "#EF4444",
                  textShadow:
                    remaining > 10
                      ? "0 0 40px rgba(168, 85, 247, 0.45)"
                      : "0 0 50px rgba(239, 68, 68, 0.7)",
                }}
              >
                {mins}:{secs}
              </div>

              {remaining === 0 && (
                <div className="text-sm sm:text-lg font-bold text-amber-300 animate-pulse tracking-wide uppercase">
                  Voting Closed · Finalizing audience tally…
                </div>
              )}
            </div>

            {/* Live Audience Engagement Metrics */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white/10 border border-white/20 px-6 py-3 text-base sm:text-lg font-extrabold backdrop-blur-md shadow-lg">
                <Users className="h-5 w-5 text-purple-300" />
                <span>{liveVotes} Live Votes Cast</span>
              </div>

              {liveVotes > 0 && (
                <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white/10 border border-white/20 px-6 py-3 text-base sm:text-lg font-extrabold backdrop-blur-md shadow-lg text-amber-300">
                  <Star className="h-5 w-5 fill-amber-300 text-amber-300" />
                  <span>Avg: {liveAvg.toFixed(2)} ★</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── STANDBY / IDLE STATE (Between acts) ── */
          <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-3xl animate-fade-in py-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 border border-white/15 text-amber-300 shadow-2xl">
              <Sparkles className="h-10 w-10 animate-spin-slow" />
            </div>

            <div className="space-y-3">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-amber-400">
                Live Cultural Festival Stage
              </span>
              <h1
                className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight drop-shadow-md"
                style={{ fontFamily: "var(--font-bricolage)" }}
              >
                {config?.festName ?? "Euphoria 2026"}
              </h1>
              <p className="text-base sm:text-xl text-white/70 font-medium max-w-xl mx-auto">
                Stage ready · Waiting for administrator to start the next performance voting window.
              </p>
            </div>

            {/* Upcoming Schedule Teaser for the Audience */}
            {upcomingActs.length > 0 && (
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-md space-y-3 shadow-xl">
                <div className="flex items-center justify-between text-xs font-bold text-white/60 uppercase tracking-wider">
                  <span>Up Next on Stage</span>
                  <span>{upcomingActs.length} Scheduled Acts</span>
                </div>
                <div className="space-y-2">
                  {upcomingActs.slice(0, 3).map((act, index) => {
                    const dept = act.departmentId ? deptMap[act.departmentId] : null;
                    return (
                      <div
                        key={act.id}
                        className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white/70">
                            {index + 1}
                          </span>
                          <span className="text-sm font-bold text-white truncate">{act.name}</span>
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
      <footer className="relative z-20 flex items-center justify-between px-6 py-3 border-t border-white/10 text-[11px] text-white/40">
        <span>Auditorium Projector Feed · Controlled by Admin Console</span>
        <span>Meenakshi Sundararajan Engineering College</span>
      </footer>
    </div>
  );
}
