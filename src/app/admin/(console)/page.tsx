"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  CheckCircle2,
  Clock,
  Music,
  Building2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Timer,
  Play,
  Square,
  PlusCircle,
  RotateCcw,
  ExternalLink,
  Tv,
  BarChart3,
  Star,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppConfig, useActiveEvent, useDepartments, useCategories, usePerformances } from "@/hooks/useData";
import { useVotingState } from "@/hooks/useVotingState";
import { updateAppConfig, updateRegistrationStatus } from "@/lib/admin/settings";
import { getStudentStats } from "@/lib/admin/students";
import { getCategories } from "@/lib/admin/categories";
import {
  startPerformanceVoting,
  stopPerformanceVoting,
  extendPerformanceVoting,
  resetStageState,
} from "@/lib/admin/stage";
import { query, where, getCountFromServer, collection, onSnapshot } from "firebase/firestore";
import { usersRef } from "@/lib/firebase/paths";
import { db, auth } from "@/lib/firebase/client";
import { OFFICIAL_DEPARTMENTS_LIST } from "@/config/departments";


// ── Countdown Hook (uses server offset) ────────────────────────────────────────
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

const DURATION_PRESETS = [
  { label: "30s", seconds: 30 },
  { label: "60s (1m)", seconds: 60 },
  { label: "90s", seconds: 90 },
  { label: "120s (2m)", seconds: 120 },
  { label: "180s (3m)", seconds: 180 },
];

export default function AdminOverviewPage() {
  const { config, loading: configLoading } = useAppConfig();
  const eventId = config?.activeEventId ?? null;
  const { event } = useActiveEvent(eventId);
  const { departments, loading: deptsLoading } = useDepartments();
  const { categories } = useCategories();
  const { performances, loading: perfsLoading } = usePerformances(eventId);
  const { votingState, serverOffsetMs } = useVotingState(eventId);

  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<{
    registered: number;
    verified: number;
    unverified: number;
    performanceCount: number;
    departmentCounts: Record<string, number>;
  }>({
    registered: 0,
    verified: 0,
    unverified: 0,
    performanceCount: 0,
    departmentCounts: {},
  });

  const [categoryCount, setCategoryCount] = useState(0);
  const [updatingRegistration, setUpdatingRegistration] = useState(false);

  // Live Stage State Controls
  const [selectedPerfId, setSelectedPerfId] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [customDurationInput, setCustomDurationInput] = useState<string>("");
  const [stageActing, setStageActing] = useState(false);
  const [liveVotes, setLiveVotes] = useState(0);
  const [liveAvg, setLiveAvg] = useState(0);
  // Per-rating distribution (1★ – 5★)
  const [ratingDist, setRatingDist] = useState<number[]>([0, 0, 0, 0, 0]);
  // Confirmation dialogs
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const isOpen = votingState?.status === "open";
  const activeId = votingState?.activePerformanceId ?? null;
  const endsAtMs = votingState?.votingEndsAt ? votingState.votingEndsAt.toMillis() : null;
  const remaining = useCountdown(isOpen ? endsAtMs : null, serverOffsetMs);

  const activePerf = performances.find((p) => p.id === activeId);
  const scheduledPerfs = performances.filter((p) => p.status === "scheduled");

  // Map departments & categories
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Real-time live vote count via onSnapshot when stage is open
  useEffect(() => {
    if (!isOpen || !eventId || !activeId) {
      setLiveVotes(0);
      setLiveAvg(0);
      setRatingDist([0, 0, 0, 0, 0]);
      return;
    }
    const votesCol = collection(db, "events", eventId, "performances", activeId, "votes");
    const unsub = onSnapshot(
      votesCol,
      (snap) => {
        const dist = [0, 0, 0, 0, 0];
        let totalPoints = 0;
        snap.forEach((doc) => {
          const r = (doc.data().rating as number) ?? 0;
          if (r >= 1 && r <= 5) {
            dist[r - 1]++;
            totalPoints += r;
          }
        });
        const total = snap.size;
        setLiveVotes(total);
        setLiveAvg(total > 0 ? totalPoints / total : 0);
        setRatingDist(dist);
      },
      () => {
        // silent fallback — no permission to list votes means 0
      }
    );
    return () => unsub();
  }, [isOpen, eventId, activeId]);


  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const studentStatsPromise = getStudentStats();
      const catsPromise = getCategories();

      const [sStats, cats] = await Promise.all([
        studentStatsPromise,
        catsPromise,
      ]);

      setCategoryCount(cats.length);

      // Fetch per-department counts via aggregation query
      const deptCountMap: Record<string, number> = {};
      await Promise.all([
        ...OFFICIAL_DEPARTMENTS_LIST.map(async (d) => {
          const q = query(usersRef(), where("departmentCode", "==", d.code));
          const snap = await getCountFromServer(q);
          deptCountMap[d.code] = snap.data().count;
        }),
        ...departments.map(async (d) => {
          const q = query(usersRef(), where("departmentId", "==", d.id));
          const snap = await getCountFromServer(q);
          deptCountMap[d.id] = (deptCountMap[d.id] ?? 0) + snap.data().count;
        }),
      ]);

      setStats({
        registered: sStats.total,
        verified: sStats.verified,
        unverified: sStats.unverified,
        performanceCount: performances.length,
        departmentCounts: deptCountMap,
      });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to refresh statistics");
    } finally {
      setLoadingStats(false);
    }
  }, [departments, performances.length]);

  useEffect(() => {
    if (!configLoading && !deptsLoading) {
      fetchStats();
    }
  }, [configLoading, deptsLoading, fetchStats]);

  // Handle Registration Open / Closed toggle cleanly without page reload
  const handleToggleRegistration = async (open: boolean) => {
    setUpdatingRegistration(true);
    try {
      await updateRegistrationStatus(open);
      toast.success(
        open
          ? "Student Registration is now OPEN! College students can register."
          : "Student Registration is now CLOSED! Signups paused."
      );
    } catch (err: unknown) {
      toast.error("Failed to update registration status. Please try again.");
      console.error("[handleToggleRegistration]", err);
    } finally {
      setUpdatingRegistration(false);
    }
  };

  // Stage timer handlers
  const handleStartVoting = async () => {
    if (!eventId || !selectedPerfId) {
      toast.error("Please select a performance to start voting.");
      return;
    }
    const duration = customDurationInput ? parseInt(customDurationInput, 10) : selectedDuration;
    if (isNaN(duration) || duration < 10) {
      toast.error("Please select or enter a valid duration (minimum 10 seconds).");
      return;
    }

    setStageActing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Not authenticated");
      await startPerformanceVoting(eventId, selectedPerfId, duration, idToken);
      toast.success(`Live voting started for ${duration}s!`);
      setSelectedPerfId("");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to start live voting");
      console.error(err);
    } finally {
      setStageActing(false);
    }
  };

  const handleStopVotingConfirmed = async () => {
    if (!eventId || !activeId) return;
    setStageActing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Not authenticated");
      const tally = await stopPerformanceVoting(eventId, activeId, idToken);
      toast.success(
        `Voting closed! Finalized with ${tally.totalVotes} votes (Avg: ${tally.averageRating.toFixed(2)} ★ · ${tally.percentageScore.toFixed(1)}%)`
      );
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to close voting");
      console.error(err);
    } finally {
      setStageActing(false);
    }
  };

  const handleExtendVoting = async () => {
    if (!eventId) return;
    setStageActing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Not authenticated");
      await extendPerformanceVoting(eventId, 30, idToken);
      toast.success("Extended voting by +30 seconds!");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to extend timer");
      console.error(err);
    } finally {
      setStageActing(false);
    }
  };

  const handleResetStageConfirmed = async () => {
    if (!eventId) return;
    setStageActing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Not authenticated");
      await resetStageState(eventId, idToken);
      toast.info("Stage reset to idle state. All votes are preserved.");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Failed to reset stage");
      console.error(err);
    } finally {
      setStageActing(false);
    }
  };


  // Checklist items
  const isDomainConfigured =
    config?.allowedEmailDomains &&
    config.allowedEmailDomains.length > 0 &&
    !config.allowedEmailDomains.includes("college.edu");

  const hasDepartments = departments.length > 0;
  const hasCategories = categoryCount > 0;
  const hasPerformances = performances.length > 0;
  const hasActiveEvent = !!config?.activeEventId;
  const isRegistrationOpen = !!config?.registrationOpen;

  const checklist = [
    {
      title: "College email domain configured",
      desc: isDomainConfigured
        ? `Configured (${config?.allowedEmailDomains.join(", ")})`
        : "Replace placeholder domain 'college.edu' with real campus domain",
      passed: isDomainConfigured,
      href: "/admin/settings",
    },
    {
      title: "Active event selected",
      desc: hasActiveEvent
        ? `Event: ${event?.name ?? config?.activeEventId}`
        : "Select an active event",
      passed: hasActiveEvent,
      href: "/admin/settings",
    },
    {
      title: "Departments created",
      desc: hasDepartments ? `${departments.length} departments` : "Add participating departments",
      passed: hasDepartments,
      href: "/admin/departments",
    },
    {
      title: "Competition categories created",
      desc: hasCategories ? `${categoryCount} categories` : "Add performance categories",
      passed: hasCategories,
      href: "/admin/categories",
    },
    {
      title: "Performances scheduled",
      desc: hasPerformances
        ? `${performances.length} performances added`
        : "Add acts and lineup for the festival",
      passed: hasPerformances,
      href: "/admin/performances",
    },
    {
      title: "Student registration open",
      desc: isRegistrationOpen
        ? "Registration is currently OPEN"
        : "Registration is CLOSED",
      passed: isRegistrationOpen,
      href: "/admin/settings",
    },
  ];

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Admin Console
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Live stage control, festival health, and registration management
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/organizer/dashboard"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition hover:bg-slate-50"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
            title="Open Live Timer Projector in new tab"
          >
            <Tv className="h-3.5 w-3.5 text-purple-600" />
            <span>Timer Projector</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>
          <Link
            href="/organizer/results"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition hover:bg-slate-50"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
            title="Open Results Bar Chart Projector in new tab"
          >
            <BarChart3 className="h-3.5 w-3.5 text-amber-600" />
            <span>Chart Projector</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loadingStats}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── REGISTRATION CONTROL BANNER ── */}
      <Card
        className="border-2 transition-all"
        style={{
          borderColor: isRegistrationOpen ? "#16A34A" : "#D97706",
          background: isRegistrationOpen ? "rgba(22, 163, 74, 0.05)" : "rgba(217, 119, 6, 0.05)",
        }}
      >
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-6 gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 transition"
              style={{
                background: isRegistrationOpen ? "#16A34A" : "#D97706",
                color: "#ffffff",
              }}
            >
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold" style={{ color: "var(--ink)" }}>
                  Student Registration is {isRegistrationOpen ? "OPEN" : "CLOSED"}
                </h3>
                <Badge
                  variant={isRegistrationOpen ? "default" : "outline"}
                  className={isRegistrationOpen ? "bg-emerald-600 text-white" : "border-amber-500 text-amber-700"}
                >
                  {isRegistrationOpen ? "● Live / Accepting Signups" : "Paused / Locked"}
                </Badge>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                {isRegistrationOpen
                  ? "Students from @msec.edu.in can sign up and verify their register number."
                  : "Registration is locked. Students see a polite 'Registration Closed' notice."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span className="text-xs sm:text-sm font-bold" style={{ color: isRegistrationOpen ? "#16A34A" : "#B45309" }}>
              {isRegistrationOpen ? "Registration Open" : "Registration Closed"}
            </span>
            <Switch
              checked={isRegistrationOpen}
              onCheckedChange={handleToggleRegistration}
              disabled={updatingRegistration || configLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── LIVE STAGE & TIMER CONTROLLER (ADMIN) ── */}
      <Card
        className="border-2 shadow-sm"
        style={{
          borderColor: isOpen ? "#7C3AED" : "var(--border)",
          background: "var(--surface)",
        }}
      >
        <CardHeader className="pb-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  background: isOpen ? "rgba(124, 58, 237, 0.12)" : "rgba(245, 158, 11, 0.12)",
                  color: isOpen ? "#7C3AED" : "#D97706",
                }}
              >
                <Timer className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold" style={{ color: "var(--ink)" }}>
                  Live Stage Voting & Timer Controller
                </CardTitle>
                <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Admin control center · Select act, set timer duration, and launch live auditorium voting
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                  isOpen ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                {isOpen ? "STAGE LIVE" : "STAGE IDLE"}
              </span>

              {votingState?.status === "closed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResetDialog(true)}
                  disabled={stageActing}
                  className="h-7 text-xs flex items-center gap-1 text-slate-500 hover:text-slate-800"
                  title="Reset stage to idle"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {isOpen ? (
            /* ── LIVE STAGE ACTIVE STATE ── */
            <div className="space-y-5">
              <div
                className="rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6"
                style={{ background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(244, 114, 182, 0.08) 100%)", border: "1px solid rgba(124, 58, 237, 0.2)" }}
              >
                <div className="space-y-1.5 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Voting Active
                    </span>
                    {activePerf?.departmentId && deptMap[activePerf.departmentId] && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-xs"
                        style={{ background: deptMap[activePerf.departmentId].color }}
                      >
                        {deptMap[activePerf.departmentId].name}
                      </span>
                    )}
                    {activePerf?.categoryId && catMap[activePerf.categoryId] && (
                      <span className="rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-xs font-medium text-purple-800">
                        {catMap[activePerf.categoryId].name}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black" style={{ color: "var(--ink)", fontFamily: "var(--font-bricolage)" }}>
                    {activePerf?.name ?? "Live Act"}
                  </h4>
                  {activePerf?.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">{activePerf.description}</p>
                  )}
                </div>

                {/* Big Live Countdown */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Countdown Clock
                  </span>
                  <span
                    className="font-mono text-5xl sm:text-6xl font-black tabular-nums tracking-tight"
                    style={{ color: remaining > 10 ? "#7C3AED" : "#DC2626" }}
                  >
                    {mins}:{secs}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-purple-800 border border-purple-100 shadow-xs">
                      <Users className="h-3 w-3 text-purple-600" />
                      <span>{liveVotes} Votes</span>
                    </span>
                    {liveVotes > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-100 shadow-xs">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{liveAvg.toFixed(2)} ★</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons when Live */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowStopDialog(true)}
                  disabled={stageActing}
                  className="flex-1 min-h-[46px] flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                  style={{ background: "#DC2626" }}
                >
                  <Square className="h-4 w-4" />
                  {stageActing ? "Finalizing Tally…" : "Stop & Finalize Voting Tally"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExtendVoting}
                  disabled={stageActing}
                  className="min-h-[46px] px-4 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <PlusCircle className="h-4 w-4 text-amber-600" />
                  Extend +30s
                </Button>
              </div>

              {/* Live Rating Distribution */}
              {liveVotes > 0 && (
                <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}>
                  <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    Live Rating Distribution ({liveVotes} votes · {liveAvg.toFixed(2)} ★ avg)
                  </p>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingDist[star - 1] ?? 0;
                      const pct = liveVotes > 0 ? (count / liveVotes) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-right font-bold text-slate-600">{star}★</span>
                          <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: star >= 4 ? "#16A34A" : star === 3 ? "#D97706" : "#DC2626",
                              }}
                            />
                          </div>
                          <span className="w-8 font-bold tabular-nums text-slate-700">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* ── STAGE IDLE / SET TIMER CONTROLS ── */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Act Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Music className="h-3.5 w-3.5 text-purple-600" />
                    <span>Select Scheduled Act for Live Voting</span>
                  </label>
                  <select
                    className="w-full rounded-[12px] border px-3 py-2.5 text-sm font-medium outline-none transition focus:ring-2 focus:ring-purple-400/40"
                    style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", minHeight: "44px" }}
                    value={selectedPerfId}
                    onChange={(e) => setSelectedPerfId(e.target.value)}
                  >
                    <option value="">— Choose a scheduled performance —</option>
                    {scheduledPerfs.map((p) => {
                      const dept = deptMap[p.departmentId]?.shortName ?? "";
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} {dept ? `(${dept})` : ""}
                        </option>
                      );
                    })}
                    {scheduledPerfs.length === 0 && (
                      <option disabled value="">No scheduled acts remaining in this event</option>
                    )}
                  </select>
                </div>

                {/* 2. Duration Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Voting Duration</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {DURATION_PRESETS.map((p) => (
                      <button
                        key={p.seconds}
                        type="button"
                        onClick={() => {
                          setSelectedDuration(p.seconds);
                          setCustomDurationInput("");
                        }}
                        className="rounded-xl border px-3 py-2 text-xs font-bold transition"
                        style={{
                          borderColor: selectedDuration === p.seconds && !customDurationInput ? "#7C3AED" : "var(--border)",
                          background: selectedDuration === p.seconds && !customDurationInput ? "rgba(124, 58, 237, 0.1)" : "var(--surface)",
                          color: selectedDuration === p.seconds && !customDurationInput ? "#7C3AED" : "var(--ink)",
                          minHeight: "38px",
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Custom sec"
                        value={customDurationInput}
                        onChange={(e) => setCustomDurationInput(e.target.value)}
                        className="w-24 rounded-xl border px-2.5 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-purple-400"
                        style={{ border: "1px solid var(--border)", minHeight: "38px" }}
                        min={10}
                        max={600}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <Button
                type="button"
                onClick={handleStartVoting}
                disabled={!selectedPerfId || stageActing || !eventId}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-white shadow-md transition hover:opacity-95"
                style={{ background: "#16A34A" }}
              >
                <Play className="h-4 w-4" />
                {stageActing
                  ? "Starting Stage Timer…"
                  : `Start Live Voting Timer (${customDurationInput ? customDurationInput + "s" : selectedDuration + "s"})`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              Total Registered
            </CardTitle>
            <Users className="h-4 w-4" style={{ color: "var(--primary)" }} />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>
                {stats.registered}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              Students created accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              Verified Students
            </CardTitle>
            <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--success)" }}>
                {stats.verified}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              Eligible to vote on event day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              Unverified
            </CardTitle>
            <Clock className="h-4 w-4" style={{ color: "var(--warning)" }} />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--warning)" }}>
                {stats.unverified}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              Awaiting email verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              Lineup Acts
            </CardTitle>
            <Music className="h-4 w-4" style={{ color: "var(--secondary)" }} />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--secondary)" }}>
                {performances.length}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
              In event: {event?.name ?? "None"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── GRID: READINESS CHECKLIST & DEPARTMENT BREAKDOWN ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Checklist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" style={{ color: "var(--primary)" }} />
              Event Readiness Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between rounded-xl p-3 border"
                style={{
                  background: item.passed ? "var(--surface)" : "var(--surface-alt)",
                  borderColor: item.passed ? "var(--border)" : "var(--warning)",
                }}
              >
                <div className="flex items-start gap-3">
                  {item.passed ? (
                    <CheckCircle2
                      className="h-5 w-5 mt-0.5 shrink-0"
                      style={{ color: "var(--success)" }}
                    />
                  ) : (
                    <AlertCircle
                      className="h-5 w-5 mt-0.5 shrink-0"
                      style={{ color: "var(--warning)" }}
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
                <Link href={item.href}>
                  <Button variant="ghost" size="sm" className="h-8 text-xs flex items-center gap-1">
                    Manage <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Per-Department registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" style={{ color: "var(--primary)" }} />
              Registrations by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {OFFICIAL_DEPARTMENTS_LIST.map((d) => {
                  const count =
                    (stats.departmentCounts[d.code] ?? 0) +
                    (stats.departmentCounts[`dept-${d.shortCode.toLowerCase()}`] ?? 0);
                  return (
                    <div
                      key={d.code}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: d.color }}
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-800">
                            {d.name}
                          </span>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {d.shortCode}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold tabular-nums px-2 py-0.5 rounded-md bg-slate-50 border text-slate-800">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── STOP VOTING CONFIRMATION DIALOG ── */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <Square className="h-5 w-5" />
              Stop &amp; Finalize Voting?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This will <strong>permanently lock</strong> the vote tally for{" "}
                <strong>{activePerf?.name ?? "this act"}</strong> and close the voting window for all students.
              </span>
              <span className="block text-amber-700 font-medium">
                This action cannot be undone. Votes will be finalized and scores calculated.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stageActing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStopVotingConfirmed}
              disabled={stageActing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {stageActing ? "Finalizing…" : "Yes, Stop & Finalize"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── RESET STAGE CONFIRMATION DIALOG ── */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-slate-600" />
              Reset Stage to Idle?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This will reset the stage state back to <strong>idle</strong>. The active performance reference will be cleared.
              </span>
              <span className="block text-emerald-700 font-medium">
                ✓ All vote documents are preserved. No data is deleted.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stageActing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetStageConfirmed}
              disabled={stageActing}
            >
              {stageActing ? "Resetting…" : "Yes, Reset Stage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
