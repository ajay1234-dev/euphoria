"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  getAggregateFromServer,
  count,
  sum,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig, usePerformances } from "@/hooks/useData";
import { useVotingState } from "@/hooks/useVotingState";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { Timer, BarChart3, LogOut, Play, Square, Sliders, Users, Star } from "lucide-react";
import type { Performance } from "@/types/firestore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PerfWithId extends Performance {
  id: string;
  voteCount?: number;
  ratingSum?: number;
}

// ── Voting duration options ───────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: "30 s", seconds: 30 },
  { label: "60 s", seconds: 60 },
  { label: "90 s", seconds: 90 },
  { label: "120 s", seconds: 120 },
  { label: "180 s", seconds: 180 },
];

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(endsAtMs: number | null): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endsAtMs) { setRemaining(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.round((endsAtMs - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAtMs]);

  return remaining;
}

// ── Vertical Bar Chart ────────────────────────────────────────────────────────

interface BarChartProps {
  performances: PerfWithId[];
  activeId: string | null;
}

function VerticalBarChart({ performances, activeId }: BarChartProps) {
  const relevant = performances.filter(
    (p) => p.status === "completed" || p.status === "live" || (p.voteCount ?? 0) > 0
  );

  if (relevant.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No completed performances yet</p>
        <p className="text-xs mt-1">Ratings will appear here as acts finish</p>
      </div>
    );
  }

  const maxVotes = Math.max(...relevant.map((p) => p.voteCount ?? 0), 1);
  const MAX_BAR_PX = 160;

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="flex items-end gap-4 min-w-max px-2 pt-4"
        style={{ minHeight: `${MAX_BAR_PX + 80}px` }}
        role="img"
        aria-label="Vertical bar chart of performance ratings"
      >
        {relevant.map((perf) => {
          const votes = perf.voteCount ?? 0;
          const avg = votes > 0 ? (perf.ratingSum ?? 0) / votes : 0;
          const barH = votes > 0 ? Math.max(Math.round((votes / maxVotes) * MAX_BAR_PX), 8) : 4;
          const isActive = perf.id === activeId;

          return (
            <div key={perf.id} className="flex flex-col items-center gap-1.5" style={{ width: "72px" }}>
              {/* Star avg */}
              <span className="text-xs font-bold tabular-nums" style={{ color: "var(--primary)" }}>
                {votes > 0 ? avg.toFixed(1) + " ★" : "—"}
              </span>

              {/* Bar */}
              <div
                className="w-full rounded-t-xl relative transition-all duration-700"
                style={{
                  height: `${barH}px`,
                  background: isActive
                    ? "linear-gradient(to top, #7C3AED, #A855F7)"
                    : votes > 0
                    ? "linear-gradient(to top, #7C3AED44, #7C3AED99)"
                    : "#E2E8F0",
                }}
                title={`${perf.name}: ${votes} votes, avg ${avg.toFixed(2)}`}
              >
                {isActive && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                )}
              </div>

              {/* Vote count */}
              <span className="text-[11px] tabular-nums text-slate-400">{votes} votes</span>

              {/* Act name */}
              <span className="text-center text-[10px] font-semibold leading-tight text-slate-700 line-clamp-2">
                {perf.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Timer Panel ───────────────────────────────────────────────────────────────

interface TimerPanelProps {
  eventId: string | null;
  performances: PerfWithId[];
}

function TimerPanel({ eventId, performances }: TimerPanelProps) {
  const { votingState } = useVotingState(eventId);
  const [selectedPerfId, setSelectedPerfId] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveVotes, setLiveVotes] = useState<number>(0);
  const [liveAvg, setLiveAvg] = useState<number>(0);

  const endsAtMs = votingState?.votingEndsAt
    ? votingState.votingEndsAt.toMillis()
    : null;
  const remaining = useCountdown(
    votingState?.status === "open" ? endsAtMs : null
  );

  const isOpen = votingState?.status === "open";
  const activeId = votingState?.activePerformanceId ?? null;
  const activePerfName = performances.find((p) => p.id === activeId)?.name ?? null;

  const scheduledPerfs = performances.filter((p) => p.status === "scheduled");

  // Server-side live aggregation polling: zero student write contention
  useEffect(() => {
    if (!isOpen || !eventId || !activeId) {
      setLiveVotes(0);
      setLiveAvg(0);
      return;
    }
    const fetchTally = async () => {
      try {
        const votesCol = collection(db, "events", eventId, "performances", activeId, "votes");
        const snap = await getAggregateFromServer(votesCol, {
          totalCount: count(),
          ratingSum: sum("rating"),
        });
        const c = snap.data().totalCount ?? 0;
        const s = snap.data().ratingSum ?? 0;
        setLiveVotes(c);
        setLiveAvg(c > 0 ? s / c : 0);
      } catch {
        // silent fallback
      }
    };
    fetchTally();
    const timer = setInterval(fetchTally, 2500);
    return () => clearInterval(timer);
  }, [isOpen, eventId, activeId]);

  async function handleStart() {
    if (!eventId || !selectedPerfId) return;
    setError(null);
    setActing(true);
    try {
      const endsAt = new Date(Date.now() + selectedDuration * 1000);
      await updateDoc(doc(db, "events", eventId, "state", "current"), {
        status: "open",
        activePerformanceId: selectedPerfId,
        votingEndsAt: endsAt,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "events", eventId, "performances", selectedPerfId), {
        status: "live",
        votingStartedAt: serverTimestamp(),
        votingEndsAt: endsAt,
        updatedAt: serverTimestamp(),
      });
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to start voting");
    } finally {
      setActing(false);
    }
  }

  async function handleStop() {
    if (!eventId) return;
    setError(null);
    setActing(true);
    try {
      await updateDoc(doc(db, "events", eventId, "state", "current"), {
        status: "closed",
        votingEndsAt: null,
        updatedAt: serverTimestamp(),
      });
      if (activeId) {
        try {
          const votesCol = collection(db, "events", eventId, "performances", activeId, "votes");
          const snap = await getAggregateFromServer(votesCol, {
            totalCount: count(),
            ratingSum: sum("rating"),
          });
          const c = snap.data().totalCount ?? 0;
          const s = snap.data().ratingSum ?? 0;
          await updateDoc(doc(db, "events", eventId, "performances", activeId), {
            status: "completed",
            voteCount: c,
            ratingSum: s,
            updatedAt: serverTimestamp(),
          });
        } catch {
          await updateDoc(doc(db, "events", eventId, "performances", activeId), {
            status: "completed",
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to stop voting");
    } finally {
      setActing(false);
    }
  }

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  return (
    <div
      className="rounded-[20px] border p-6 sm:p-8 space-y-6"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}>
          <Timer className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Voting Timer</h2>
          <p className="text-xs text-slate-500">Start or stop live voting for a performance</p>
        </div>
        <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
          {isOpen ? "LIVE" : "IDLE"}
        </span>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-xs" style={{ background: "var(--error-soft)", color: "var(--error)", border: "1px solid var(--error)" }}>
          {error}
        </div>
      )}

      {/* Countdown */}
      {isOpen && (
        <div className="flex flex-col items-center gap-2.5 py-6 px-4 rounded-2xl" style={{ background: "var(--primary-soft)" }}>
          <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
            {activePerfName ?? "Performance"} — closes in
          </p>
          <span
            className="font-mono text-5xl xs:text-6xl sm:text-7xl font-black tabular-nums tracking-tight"
            style={{ color: remaining > 10 ? "var(--primary)" : "#DC2626" }}
          >
            {mins}:{secs}
          </span>
          {remaining === 0 && (
            <span className="text-xs font-semibold text-slate-500 animate-pulse">Voting closed — finalising tally…</span>
          )}

          {/* Live Votes Counter & Star Average */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold text-purple-800 shadow-xs">
              <Users className="h-4 w-4 text-purple-600" />
              <span>{liveVotes} Live Votes Cast</span>
            </span>
            {liveVotes > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold text-amber-700 shadow-xs">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>Avg: {liveAvg.toFixed(2)} ★</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      {!isOpen ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Select Performance</label>
            <select
              className="w-full rounded-[12px] border px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-amber-400/40"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", minHeight: "48px" }}
              value={selectedPerfId}
              onChange={(e) => setSelectedPerfId(e.target.value)}
            >
              <option value="">— Choose an act —</option>
              {scheduledPerfs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {scheduledPerfs.length === 0 && (
              <p className="text-xs text-slate-400">No scheduled performances available.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Voting Duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.seconds}
                  type="button"
                  onClick={() => setSelectedDuration(opt.seconds)}
                  className="rounded-xl border px-4 py-2 text-xs font-bold transition"
                  style={{
                    borderColor: selectedDuration === opt.seconds ? "#D97706" : "var(--border)",
                    background: selectedDuration === opt.seconds ? "rgba(245,158,11,0.1)" : "var(--surface)",
                    color: selectedDuration === opt.seconds ? "#B45309" : "var(--ink)",
                    minHeight: "40px",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedPerfId || acting}
            onClick={handleStart}
            className="w-full rounded-[14px] py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "#16A34A", minHeight: "48px" }}
          >
            <Play className="h-4 w-4" />
            {acting ? "Starting…" : `Start ${selectedDuration}s Voting`}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={acting}
          onClick={handleStop}
          className="w-full rounded-[14px] py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "#DC2626", minHeight: "48px" }}
        >
          <Square className="h-4 w-4" />
          {acting ? "Stopping…" : "Stop Voting Now"}
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrganizerDashboardPage() {
  const { status } = useAuth();
  const { config } = useAppConfig();
  const router = useRouter();
  const eventId = config?.activeEventId ?? null;
  const { performances: rawPerfs, loading: perfsLoading } = usePerformances(eventId);
  const { votingState } = useVotingState(eventId);

  const performances = rawPerfs as PerfWithId[];

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

  const activeId = votingState?.activePerformanceId ?? null;

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 h-16 border-b backdrop-blur-md"
        style={{ background: "rgba(255,255,255,0.95)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(245,158,11,0.15)", color: "#D97706" }}>
            <Sliders className="h-4 w-4" />
          </div>
          <span className="text-base font-bold" style={{ fontFamily: "var(--font-bricolage)", color: "#B45309" }}>
            Organizer Console
          </span>
          <span className="hidden sm:inline text-xs text-slate-400 ml-1">
            · {config?.festName ?? "Euphoria 2026"}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
          style={{ minHeight: "40px" }}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Section 1: Timer */}
        <TimerPanel eventId={eventId} performances={performances} />

        {/* Section 2: Vertical Bar Chart */}
        <div
          className="rounded-[20px] border p-6 sm:p-8"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Ratings</h2>
              <p className="text-xs text-slate-500">Average star rating per performance · updates in real time</p>
            </div>
          </div>
          <VerticalBarChart performances={performances} activeId={activeId} />
        </div>
      </main>
    </div>
  );
}
