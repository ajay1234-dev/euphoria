"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig, usePerformances, useDepartments } from "@/hooks/useData";
import { useVotingState } from "@/hooks/useVotingState";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import {
  BarChart3,
  Timer,
  LogOut,
  Maximize2,
  Minimize2,
  Trophy,
  Star,
  ArrowUpDown,
} from "lucide-react";
import type { Performance } from "@/types/firestore";

interface PerfWithId extends Performance {
  id: string;
}

export default function OrganizerResultsPage() {
  const { status } = useAuth();
  const { config } = useAppConfig();
  const router = useRouter();
  const eventId = config?.activeEventId ?? null;
  const { performances: rawPerfs, loading: perfsLoading } = usePerformances(eventId);
  const { departments } = useDepartments();
  const { votingState } = useVotingState(eventId);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortBy, setSortBy] = useState<"rank" | "order">("rank");

  const performances = rawPerfs as PerfWithId[];
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));

  const activeId = votingState?.activePerformanceId ?? null;

  // Filter acts that have been finalized or are live/completed — use server-computed aggregates
  const relevantActs = useMemo(() => {
    const scored = performances.filter(
      (p) => p.status === "completed" || p.status === "live" || (p.totalVotes ?? 0) > 0
    );

    if (sortBy === "rank") {
      // Sort by percentageScore desc, then totalVotes desc (no penalty for fewer votes)
      return [...scored].sort((a, b) => {
        const aScore = a.percentageScore ?? (a.averageRating ? (a.averageRating / 5) * 100 : 0);
        const bScore = b.percentageScore ?? (b.averageRating ? (b.averageRating / 5) * 100 : 0);
        if (Math.abs(bScore - aScore) > 0.001) return bScore - aScore;
        return (b.totalVotes ?? 0) - (a.totalVotes ?? 0);
      });
    }

    return [...scored].sort((a, b) => a.order - b.order);
  }, [performances, sortBy]);

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

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    router.replace("/");
  }, [router]);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "admin" && status !== "organizer") router.replace("/organizer/login");
  }, [status, router]);

  if (status === "loading" || perfsLoading) return <PageSkeleton />;
  if (status !== "admin" && status !== "organizer") return null;

  // Bar height based on percentageScore (0–100), max 240px
  const MAX_BAR_PX = 240;

  return (
    <div
      className="min-h-dvh flex flex-col justify-between text-white selection:bg-purple-500 selection:text-white overflow-x-hidden relative"
      style={{
        background: "linear-gradient(180deg, #07060F 0%, #0E0A1E 50%, #080612 100%)",
      }}
    >
      {/* Ambient background glow for auditorium projection */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-30"
        style={{
          background: "radial-gradient(circle at 50% 25%, rgba(217, 119, 6, 0.25) 0%, transparent 70%)",
        }}
      />

      {/* Floating Projector Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 backdrop-blur-xs border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <span
              className="text-base sm:text-lg font-black tracking-tight"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              {config?.festName ?? "Euphoria 2026"}
            </span>
            <span className="hidden sm:inline text-xs text-white/50 ml-2 font-medium tracking-wide uppercase">
              · Results & Leaderboard Projector
            </span>
          </div>
        </div>

        {/* Projector Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSortBy((prev) => (prev === "rank" ? "order" : "rank"))}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white/90 hover:bg-white/20 transition"
            title="Toggle sort order"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{sortBy === "rank" ? "Ranked" : "Lineup Order"}</span>
          </button>

          <Link
            href="/organizer/dashboard"
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition active:scale-95 shadow-sm"
            title="Switch to Live Timer Projector"
          >
            <Timer className="h-4 w-4 text-purple-300" />
            <span>Live Timer ↗</span>
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

      {/* Main Bar Chart Arena */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 w-full max-w-7xl mx-auto">
        {relevantActs.length === 0 ? (
          /* Empty Standby State */
          <div className="flex flex-col items-center justify-center space-y-5 text-center max-w-lg py-16 animate-fade-in">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 border border-white/15 text-amber-400 shadow-2xl">
              <BarChart3 className="h-10 w-10 opacity-70" />
            </div>
            <div className="space-y-2">
              <h2
                className="text-3xl sm:text-4xl font-black text-white tracking-tight"
                style={{ fontFamily: "var(--font-bricolage)" }}
              >
                Auditorium Results Board
              </h2>
              <p className="text-sm sm:text-base text-white/60 font-medium">
                No performances have completed voting yet. As soon as live voting finishes for each act, scores and vertical rankings will populate automatically here!
              </p>
            </div>
          </div>
        ) : (
          /* Vertical Bar Chart Display for Projector */
          <div className="w-full flex flex-col items-center justify-center space-y-6">
            {/* Top 3 Podium Highlights Banner */}
            {sortBy === "rank" && relevantActs.length >= 3 && (
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-2 pb-4">
                {/* 2nd Place */}
                {relevantActs[1] && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-slate-400/30 bg-white/5 px-4 py-2 backdrop-blur-md shadow-lg">
                    <span className="text-xl">🥈</span>
                    <div className="text-left">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                        2nd Place · Runner Up
                      </span>
                      <span className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] block">
                        {relevantActs[1].name}
                      </span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Champion) */}
                {relevantActs[0] && (
                  <div className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-5 py-2.5 backdrop-blur-md shadow-xl ring-2 ring-amber-400/30 scale-105">
                    <span className="text-2xl">🥇</span>
                    <div className="text-left">
                      <span className="text-[10px] uppercase tracking-widest text-amber-300 font-black block">
                        1st Place · Fest Champion
                      </span>
                      <span className="text-sm sm:text-base font-black text-white truncate max-w-[180px] block">
                        {relevantActs[0].name}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {relevantActs[2] && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-amber-700/30 bg-white/5 px-4 py-2 backdrop-blur-md shadow-lg">
                    <span className="text-xl">🥉</span>
                    <div className="text-left">
                      <span className="text-[10px] uppercase tracking-wider text-amber-600/80 font-bold block">
                        3rd Place · 2nd Runner Up
                      </span>
                      <span className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] block">
                        {relevantActs[2].name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vertical Bars Container */}
            <div className="w-full overflow-x-auto pb-4 scrollbar-none">
              <div
                className="flex items-end justify-center gap-4 sm:gap-6 min-w-max px-6 pt-10"
                style={{ minHeight: `${MAX_BAR_PX + 160}px` }}
                role="img"
                aria-label="Vertical bar chart of student performance ratings"
              >
                {relevantActs.map((perf, index) => {
                  const votes = perf.totalVotes ?? 0;
                  const avg = perf.averageRating ?? 0;
                  const score = perf.percentageScore ?? (avg > 0 ? (avg / 5) * 100 : 0);
                  // Bar height = percentageScore out of 100, proportional to MAX_BAR_PX
                  const barH = score > 0 ? Math.max(Math.round((score / 100) * MAX_BAR_PX), 16) : 8;
                  const isActive = perf.id === activeId;
                  const dept = perf.departmentId ? deptMap[perf.departmentId] : null;

                  // Podium medal for rank sort
                  const medal = sortBy === "rank" ? (index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null) : null;

                  return (
                    <div
                      key={perf.id}
                      className="flex flex-col items-center gap-2 group transition-transform duration-300 hover:scale-105"
                      style={{ width: "90px" }}
                    >
                      {/* Medal / Rank Tag */}
                      {medal && (
                        <span className="text-xl -mb-1 animate-bounce">{medal}</span>
                      )}

                      {/* Percentage Score Badge */}
                      <span
                        className="text-xs sm:text-sm font-black tabular-nums px-2.5 py-1 rounded-full border shadow-md flex items-center gap-1"
                        style={{
                          background: index === 0 && sortBy === "rank" ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.1)",
                          borderColor: index === 0 && sortBy === "rank" ? "rgba(245, 158, 11, 0.5)" : "rgba(255, 255, 255, 0.15)",
                          color: index === 0 && sortBy === "rank" ? "#FBBF24" : "#FFFFFF",
                        }}
                      >
                        <Star className="h-3 w-3 fill-current text-amber-400" />
                        <span>{votes > 0 ? avg.toFixed(2) : "—"}</span>
                      </span>

                      {/* Percentage label */}
                      {score > 0 && (
                        <span className="text-[10px] font-bold text-white/60 tabular-nums">
                          {score.toFixed(1)}%
                        </span>
                      )}

                      {/* Vertical Bar */}
                      <div
                        className="w-16 sm:w-20 rounded-t-2xl relative transition-all duration-700 shadow-xl overflow-hidden"
                        style={{
                          height: `${barH}px`,
                          background: isActive
                            ? "linear-gradient(to top, #7C3AED, #F472B6)"
                            : dept?.color
                            ? `linear-gradient(to top, ${dept.color}99, ${dept.color})`
                            : "linear-gradient(to top, #4F46E5, #9333EA)",
                          boxShadow: isActive
                            ? "0 0 30px rgba(124, 58, 237, 0.6)"
                            : dept?.color
                            ? `0 0 20px ${dept.color}44`
                            : "none",
                        }}
                        title={`${perf.name}: ${votes} votes, avg ${avg.toFixed(2)} ★, ${score.toFixed(1)}%`}
                      >
                        {/* Shimmer / gloss highlight on the bar */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                        {isActive && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>LIVE</span>
                          </div>
                        )}
                      </div>

                      {/* Total Votes Count */}
                      <span className="text-xs font-bold tabular-nums text-white/70">
                        {votes > 0 ? `${votes} votes` : "—"}
                      </span>

                      {/* Act Title */}
                      <span className="text-center text-xs font-bold text-white line-clamp-2 leading-tight drop-shadow-sm">
                        {perf.name}
                      </span>

                      {/* Department Chip */}
                      {dept && (
                        <span
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white shadow-xs"
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
          </div>
        )}
      </main>

      {/* Subtle Projector Footer */}
      <footer className="relative z-20 flex items-center justify-between px-6 py-3 border-t border-white/10 text-[11px] text-white/40">
        <span>Auditorium Projector Feed · Final Results & Standings</span>
        <span>Meenakshi Sundararajan Engineering College</span>
      </footer>
    </div>
  );
}
