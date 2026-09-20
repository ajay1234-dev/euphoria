"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig, usePerformances, useDepartments, useCategories } from "@/hooks/useData";
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
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Eye,
  Filter,
  Sparkles,
} from "lucide-react";
import type { Performance } from "@/types/firestore";

interface PerfWithId extends Performance {
  id: string;
}

// Audio chime generator using Web Audio API (no external assets needed)
function playRevealChime(step: number, total: number) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Pitch rises from 300Hz (least rating) up to 800Hz (champion)
    const freq = 300 + (step / Math.max(total, 1)) * 500;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // audio context blocked by browser policy until gesture
  }
}

export default function OrganizerResultsPage() {
  const { status } = useAuth();
  const { config } = useAppConfig();
  const router = useRouter();
  const eventId = config?.activeEventId ?? null;
  const { performances: rawPerfs, loading: perfsLoading } = usePerformances(eventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();
  const { votingState } = useVotingState(eventId);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortBy, setSortBy] = useState<"rank" | "order">("rank");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Right-to-Left Reveal state
  // revealedCount = number of acts revealed starting from least rating (right) to best (left)
  const [revealedCount, setRevealedCount] = useState<number>(999); // 999 = all revealed initially
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const performances = rawPerfs as PerfWithId[];
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const activeId = votingState?.activePerformanceId ?? null;

  // Filter acts by category and scoring status
  const relevantActs = useMemo(() => {
    let list = performances.filter(
      (p) => p.status === "completed" || p.status === "live" || (p.totalVotes ?? 0) > 0
    );

    if (selectedCategory !== "all") {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }

    if (sortBy === "rank") {
      // Sort: Best (highest percentageScore) at index 0 (Left), Lowest at last index (Right)
      return [...list].sort((a, b) => {
        const aScore = a.percentageScore ?? (a.averageRating ? (a.averageRating / 5) * 100 : 0);
        const bScore = b.percentageScore ?? (b.averageRating ? (b.averageRating / 5) * 100 : 0);
        if (Math.abs(bScore - aScore) > 0.001) return bScore - aScore;
        return (b.totalVotes ?? 0) - (a.totalVotes ?? 0);
      });
    }

    return [...list].sort((a, b) => a.order - b.order);
  }, [performances, sortBy, selectedCategory]);

  const totalActs = relevantActs.length;
  const isFullyRevealed = revealedCount >= totalActs;

  // Auto-play timer effect
  useEffect(() => {
    if (isAutoPlaying) {
      if (revealedCount >= totalActs) {
        setIsAutoPlaying(false);
        return;
      }
      autoPlayRef.current = setTimeout(() => {
        setRevealedCount((prev) => {
          const next = prev + 1;
          playRevealChime(next, totalActs);
          return next;
        });
      }, 1800);
    }
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  }, [isAutoPlaying, revealedCount, totalActs]);

  // Start Reveal from least rating (right) to best (left)
  const handleStartReveal = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      return;
    }
    // If already fully revealed, reset to 0 first and start
    if (revealedCount >= totalActs) {
      setRevealedCount(1);
      playRevealChime(1, totalActs);
      setIsAutoPlaying(true);
    } else {
      setIsAutoPlaying(true);
    }
  };

  // Step to next act manually
  const handleNextAct = () => {
    if (revealedCount < totalActs) {
      const next = revealedCount + 1;
      setRevealedCount(next);
      playRevealChime(next, totalActs);
    }
  };

  // Reveal all acts instantly
  const handleRevealAll = () => {
    setIsAutoPlaying(false);
    setRevealedCount(totalActs);
  };

  // Reset to all hidden (start fresh)
  const handleResetReveal = () => {
    setIsAutoPlaying(false);
    setRevealedCount(0);
  };

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
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 backdrop-blur-xs border-b border-white/10">
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
              · Results Projector
            </span>
          </div>
        </div>

        {/* Projector Controls: Filter, Reveal & Fullscreen */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Specific Event / Category Selector */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="h-3.5 w-3.5 text-amber-300" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setRevealedCount(999);
                  setIsAutoPlaying(false);
                }}
                className="bg-transparent text-white font-bold outline-none cursor-pointer pr-1"
                title="Filter by event/category"
              >
                <option value="all" className="bg-slate-900 text-white">All Events / Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reveal Controls (Only when acts exist) */}
          {totalActs > 0 && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/15 p-1 rounded-xl">
              {/* Start / Pause Button */}
              <button
                type="button"
                onClick={handleStartReveal}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-sm"
                style={{
                  background: isAutoPlaying
                    ? "#DC2626"
                    : isFullyRevealed
                    ? "rgba(124, 58, 237, 0.4)"
                    : "#16A34A",
                  color: "#FFFFFF",
                }}
                title={isAutoPlaying ? "Pause reveal sequence" : "Start Right-to-Left reveal animation"}
              >
                {isAutoPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{revealedCount === 0 ? "Start Reveal" : isFullyRevealed ? "Replay Reveal" : "Resume"}</span>
                  </>
                )}
              </button>

              {/* Next Act Step */}
              {!isFullyRevealed && (
                <button
                  type="button"
                  onClick={handleNextAct}
                  className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
                  title="Reveal next act (Right to Left)"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}

              {/* Reveal All */}
              {!isFullyRevealed && (
                <button
                  type="button"
                  onClick={handleRevealAll}
                  className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white/80 hover:bg-white/20 transition"
                  title="Instantly reveal all acts"
                >
                  <Eye className="h-3 w-3" />
                  <span className="hidden md:inline">Reveal All</span>
                </button>
              )}

              {/* Reset to Hidden */}
              {revealedCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetReveal}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition"
                  title="Hide all bars to start fresh"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden md:inline">Hide</span>
                </button>
              )}
            </div>
          )}

          {/* Sort order toggle */}
          <button
            type="button"
            onClick={() => setSortBy((prev) => (prev === "rank" ? "order" : "rank"))}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white/90 hover:bg-white/20 transition"
            title="Toggle sort order"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{sortBy === "rank" ? "Ranked" : "Lineup Order"}</span>
          </button>

          {/* Live Timer link */}
          <Link
            href="/organizer/dashboard"
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95 shadow-sm"
            title="Switch to Live Timer Projector"
          >
            <Timer className="h-3.5 w-3.5 text-purple-300" />
            <span className="hidden md:inline">Timer ↗</span>
          </Link>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Sign Out */}
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
                {selectedCategory !== "all"
                  ? `No completed acts found in "${catMap[selectedCategory]?.name ?? "this category"}". Select "All Categories" or await finalized voting!`
                  : "No performances have completed voting yet. As soon as live voting finishes for each act, scores and vertical rankings will populate automatically here!"}
              </p>
            </div>
          </div>
        ) : (
          /* Vertical Bar Chart Display with Right-to-Left Reveal */
          <div className="w-full flex flex-col items-center justify-center space-y-6">
            {/* Suspense / Reveal Status Badge */}
            {!isFullyRevealed && totalActs > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-amber-300 backdrop-blur-md animate-pulse">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>
                  Live Reveal in Progress: {revealedCount} of {totalActs} acts revealed (Least to Best)
                </span>
              </div>
            )}

            {/* Top 3 Podium Highlights Banner — Revealed as top 3 are reached */}
            {sortBy === "rank" && relevantActs.length >= 3 && (
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-2 pb-4">
                {/* 2nd Place (revealed when revealedCount >= totalActs - 1) */}
                {relevantActs[1] && revealedCount >= totalActs - 1 && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-slate-400/30 bg-white/5 px-4 py-2 backdrop-blur-md shadow-lg transition-all duration-500 animate-fade-in">
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

                {/* 1st Place Champion (revealed when revealedCount >= totalActs) */}
                {relevantActs[0] && revealedCount >= totalActs && (
                  <div className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-5 py-2.5 backdrop-blur-md shadow-xl ring-2 ring-amber-400/40 scale-105 transition-all duration-700 animate-bounce-once">
                    <span className="text-2xl animate-bounce">🥇</span>
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

                {/* 3rd Place (revealed when revealedCount >= totalActs - 2) */}
                {relevantActs[2] && revealedCount >= totalActs - 2 && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-amber-700/30 bg-white/5 px-4 py-2 backdrop-blur-md shadow-lg transition-all duration-500 animate-fade-in">
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

            {/* Vertical Bars Container:
                Arranged from Left (Rank 1, Best) to Right (Lowest Rank).
                Reveal order is from Right to Left:
                Index i is revealed if (totalActs - 1 - i) < revealedCount
            */}
            <div className="w-full overflow-x-auto pb-4 scrollbar-none">
              <div
                className="flex items-end justify-center gap-4 sm:gap-6 min-w-max px-6 pt-10"
                style={{ minHeight: `${MAX_BAR_PX + 160}px` }}
                role="img"
                aria-label="Vertical bar chart of student performance ratings"
              >
                {relevantActs.map((perf, index) => {
                  // Right-to-left reveal calculation:
                  // Rightmost act (index = totalActs - 1) has revealRank = 0 -> reveals when revealedCount >= 1
                  // Leftmost act (index = 0, Rank 1) has revealRank = totalActs - 1 -> reveals when revealedCount >= totalActs
                  const revealStep = totalActs - 1 - index;
                  const isRevealed = revealStep < revealedCount;

                  const votes = perf.totalVotes ?? 0;
                  const avg = perf.averageRating ?? 0;
                  const score = perf.percentageScore ?? (avg > 0 ? (avg / 5) * 100 : 0);
                  const barH = isRevealed && score > 0 ? Math.max(Math.round((score / 100) * MAX_BAR_PX), 16) : 10;
                  const isActive = perf.id === activeId;
                  const dept = perf.departmentId ? deptMap[perf.departmentId] : null;

                  // Podium medal for rank sort (only when revealed)
                  const medal =
                    isRevealed && sortBy === "rank"
                      ? index === 0
                        ? "🥇"
                        : index === 1
                        ? "🥈"
                        : index === 2
                        ? "🥉"
                        : null
                      : null;

                  return (
                    <div
                      key={perf.id}
                      className="flex flex-col items-center gap-2 group transition-all duration-500"
                      style={{
                        width: "92px",
                        opacity: isRevealed ? 1 : 0.45,
                        transform: isRevealed ? "scale(1)" : "scale(0.95)",
                      }}
                    >
                      {/* Medal / Rank Tag */}
                      <div className="h-6 flex items-center justify-center">
                        {medal ? (
                          <span className="text-xl animate-bounce">{medal}</span>
                        ) : isRevealed ? (
                          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                            #{index + 1}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400/60 uppercase tracking-wider">
                            ???
                          </span>
                        )}
                      </div>

                      {/* Percentage Score Badge */}
                      <span
                        className="text-xs sm:text-sm font-black tabular-nums px-2.5 py-1 rounded-full border shadow-md flex items-center gap-1 transition-all"
                        style={{
                          background: !isRevealed
                            ? "rgba(255, 255, 255, 0.05)"
                            : index === 0 && sortBy === "rank"
                            ? "rgba(245, 158, 11, 0.25)"
                            : "rgba(255, 255, 255, 0.1)",
                          borderColor: !isRevealed
                            ? "rgba(255, 255, 255, 0.1)"
                            : index === 0 && sortBy === "rank"
                            ? "rgba(245, 158, 11, 0.5)"
                            : "rgba(255, 255, 255, 0.15)",
                          color: !isRevealed ? "#94A3B8" : index === 0 && sortBy === "rank" ? "#FBBF24" : "#FFFFFF",
                        }}
                      >
                        <Star className="h-3 w-3 fill-current text-amber-400" />
                        <span>{isRevealed ? (votes > 0 ? avg.toFixed(2) : "—") : "•••"}</span>
                      </span>

                      {/* Percentage label */}
                      <span className="h-4 text-[10px] font-bold text-white/60 tabular-nums">
                        {isRevealed && score > 0 ? `${score.toFixed(1)}%` : ""}
                      </span>

                      {/* Vertical Bar with smooth transition */}
                      <div
                        className="w-16 sm:w-20 rounded-t-2xl relative transition-all duration-700 shadow-xl overflow-hidden"
                        style={{
                          height: `${barH}px`,
                          background: !isRevealed
                            ? "linear-gradient(to top, rgba(255,255,255,0.05), rgba(255,255,255,0.15))"
                            : isActive
                            ? "linear-gradient(to top, #7C3AED, #F472B6)"
                            : dept?.color
                            ? `linear-gradient(to top, ${dept.color}99, ${dept.color})`
                            : "linear-gradient(to top, #4F46E5, #9333EA)",
                          boxShadow: isRevealed
                            ? isActive
                              ? "0 0 30px rgba(124, 58, 237, 0.6)"
                              : dept?.color
                              ? `0 0 20px ${dept.color}44`
                              : "none"
                            : "none",
                        }}
                        title={
                          isRevealed
                            ? `${perf.name}: ${votes} votes, avg ${avg.toFixed(2)} ★, ${score.toFixed(1)}%`
                            : "Mystery Act — Revealing Soon"
                        }
                      >
                        {/* Shimmer / gloss highlight on the bar */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                        {isActive && isRevealed && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>LIVE</span>
                          </div>
                        )}
                      </div>

                      {/* Total Votes Count */}
                      <span className="text-xs font-bold tabular-nums text-white/70">
                        {isRevealed ? (votes > 0 ? `${votes} votes` : "—") : "•••"}
                      </span>

                      {/* Act Title */}
                      <span className="text-center text-xs font-bold text-white line-clamp-2 leading-tight drop-shadow-sm min-h-[32px]">
                        {isRevealed ? perf.name : "••••••••"}
                      </span>

                      {/* Department Chip */}
                      {dept && (
                        <span
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white shadow-xs transition-opacity"
                          style={{
                            backgroundColor: isRevealed ? dept.color : "#475569",
                            opacity: isRevealed ? 1 : 0.6,
                          }}
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

