"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DepartmentChip } from "@/components/common/DepartmentChip";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAppConfig, useDepartments, useCategories, useActiveEvent } from "@/hooks/useData";
import { useVotingState } from "@/hooks/useVotingState";
import {
  getPerformances,
  createPerformance,
  updatePerformance,
  deletePerformance,
  resetPerformanceRating,
} from "@/lib/admin/performances";
import {
  startPerformanceVoting,
  extendPerformanceVoting,
  stopPerformanceVoting,
  resetStageState,
} from "@/lib/admin/stage";
import { ensureStandardCategories } from "@/lib/admin/categories";
import { PERFORMANCE_PRESET_IMAGES, getCategoryPresetImage } from "@/config/constants";
import { auth, db } from "@/lib/firebase/client";
import { collection, onSnapshot } from "firebase/firestore";
import type { Performance } from "@/types/firestore";

type PerformanceWithId = Performance & { id: string };

const PRESET_IMAGES = [
  {
    label: "🕺 Boys Dance",
    url: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "💃 Girls Dance",
    url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "🎤 Boys Singing",
    url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "🎶 Girls Singing",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "🎸 Instrumental",
    url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80",
  },
];

const DURATION_PRESETS = [30, 45, 60, 90, 120];

// Countdown timer helper
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

export default function PerformancesPage() {
  const { config } = useAppConfig();
  const eventId = config?.activeEventId ?? null;
  const { event } = useActiveEvent(eventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();
  const { votingState, serverOffsetMs } = useVotingState(eventId);

  const [performances, setPerformances] = useState<PerformanceWithId[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Voting duration settings
  const [votingDuration, setVotingDuration] = useState<number>(60);
  const [stageActing, setStageActing] = useState(false);
  const [liveVotes, setLiveVotes] = useState(0);
  const [liveAvg, setLiveAvg] = useState(0);

  // Confirmation dialogs for stage
  const [launchPerfTarget, setLaunchPerfTarget] = useState<PerformanceWithId | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PerformanceWithId | null>(null);
  const [resetRatingTarget, setResetRatingTarget] = useState<PerformanceWithId | null>(null);

  // Dialog & Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerf, setEditingPerf] = useState<PerformanceWithId | null>(null);
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOpen = votingState?.status === "open";
  const activeId = votingState?.activePerformanceId ?? null;
  const endsAtMs = votingState?.votingEndsAt ? votingState.votingEndsAt.toMillis() : null;
  const remaining = useCountdown(isOpen ? endsAtMs : null, serverOffsetMs);
  const activePerf = performances.find((p) => p.id === activeId);

  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d])),
    [departments]
  );
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Fetch performances & ensure split categories
  const fetchPerfs = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await getPerformances(eventId);
      setPerformances(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load performances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ensureStandardCategories();
  }, []);

  useEffect(() => {
    if (eventId) fetchPerfs();
  }, [eventId]);

  // Live vote count listener when stage is open
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
        setLiveVotes(snap.size);
        setLiveAvg(snap.size > 0 ? totalPoints / snap.size : 0);
      },
      (err) => console.warn("Live vote count error:", err)
    );
    return () => unsub();
  }, [isOpen, eventId, activeId]);

  // ── Stage Actions ──────────────────────────────────────────────────────────
  const handleLaunchVoting = async (perf: PerformanceWithId) => {
    if (!eventId) return;
    setStageActing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Not authenticated as admin");
      await startPerformanceVoting(eventId, perf.id, votingDuration, idToken);
      toast.success(`Live rating & likes opened for "${perf.name}" (${votingDuration}s)!`);
      setLaunchPerfTarget(null);
      fetchPerfs();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to start live rating");
    } finally {
      setStageActing(false);
    }
  };

  const handleStopVoting = async () => {
    if (!eventId || !activeId) return;
    setStageActing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Not authenticated");
      const agg = await stopPerformanceVoting(eventId, activeId, idToken);
      toast.success(
        `Rating Finalized! ${agg.totalVotes} ratings · Score: ${agg.percentageScore.toFixed(1)}% (${agg.averageRating.toFixed(2)}★)`
      );
      setShowStopDialog(false);
      fetchPerfs();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to finalize rating");
    } finally {
      setStageActing(false);
    }
  };

  // Auto-stop voting automatically when timer expires
  const autoStoppedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !eventId || !activeId || remaining > 0 || !endsAtMs) return;
    if (autoStoppedRef.current === activeId) return;
    autoStoppedRef.current = activeId;

    const autoStop = async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken(true);
        if (!idToken) return;
        const agg = await stopPerformanceVoting(eventId, activeId, idToken);
        toast.info(
          `Review timer finished! Voting automatically closed & finalized (${agg.totalVotes} votes · Score: ${agg.percentageScore.toFixed(1)}%)`
        );
        fetchPerfs();
      } catch (err) {
        console.error("[admin/performances] Auto-stop error:", err);
      }
    };
    autoStop();
  }, [isOpen, eventId, activeId, remaining, endsAtMs]);

  const handleExtendVoting = async (extraSeconds: number) => {
    if (!eventId) return;
    setStageActing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Not authenticated");
      await extendPerformanceVoting(eventId, extraSeconds, idToken);
      toast.success(`Timer extended by +${extraSeconds}s!`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to extend timer");
    } finally {
      setStageActing(false);
    }
  };

  const handleResetStage = async () => {
    if (!eventId) return;
    setStageActing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Not authenticated");
      await resetStageState(eventId, idToken);
      toast.success("Stage successfully reset to idle.");
      setShowResetDialog(false);
      fetchPerfs();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to reset stage");
    } finally {
      setStageActing(false);
    }
  };

  // ── Form Modal Handlers ───────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingPerf(null);
    const initialDeptId = selectedDeptId !== "all" ? selectedDeptId : departments[0]?.id ?? "";
    const initialCatId = selectedCatId !== "all" ? selectedCatId : categories[0]?.id ?? "";
    const initialCat = categories.find((c) => c.id === initialCatId);
    const initialDept = departments.find((d) => d.id === initialDeptId);
    setDepartmentId(initialDeptId);
    setCategoryId(initialCatId);
    setName(initialCat && initialDept ? `${initialDept.shortName} — ${initialCat.name}` : "");
    setParticipants("");
    setImageUrl(getCategoryPresetImage(initialCat?.slug, initialCat?.name));
    setDescription("");
    setDialogOpen(true);
  };

  const openEditDialog = (perf: PerformanceWithId) => {
    setEditingPerf(perf);
    setDepartmentId(perf.departmentId);
    setCategoryId(perf.categoryId);
    setName(perf.name);
    setParticipants(perf.participants ?? "");
    setImageUrl(perf.imageUrl ?? "");
    setDescription(perf.description || "");
    setDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image file size should be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
        toast.success("Image loaded!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) {
      toast.error("No active event selected");
      return;
    }
    if (!name.trim() || !departmentId || !categoryId) {
      toast.error("Please fill in required fields (Title, Department, Category)");
      return;
    }

    setSaving(true);
    try {
      if (editingPerf) {
        await updatePerformance(eventId, editingPerf.id, {
          departmentId,
          categoryId,
          name: name.trim(),
          participants: participants.trim() || null,
          imageUrl: imageUrl.trim() || null,
          description: description.trim() || null,
        });
        toast.success("Performance card updated!");
      } else {
        await createPerformance(eventId, {
          departmentId,
          categoryId,
          name: name.trim(),
          participants: participants.trim() || null,
          imageUrl: imageUrl.trim() || null,
          description: description.trim() || null,
          order: performances.length,
        });
        toast.success("Performance card added!");
      }
      setDialogOpen(false);
      fetchPerfs();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save performance");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !eventId) return;
    try {
      await deletePerformance(eventId, deleteTarget.id);
      toast.success("Performance removed");
      setDeleteTarget(null);
      fetchPerfs();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to delete performance");
    }
  };

  const handleResetRating = async () => {
    if (!resetRatingTarget || !eventId) return;
    try {
      await resetPerformanceRating(eventId, resetRatingTarget.id);
      toast.success(`Ratings and votes reset for "${resetRatingTarget.name}"`);
      setResetRatingTarget(null);
      fetchPerfs();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to reset ratings");
    }
  };

  // Filtered performances
  const filteredPerformances = useMemo(() => {
    return performances.filter((p) => {
      const matchDept = selectedDeptId === "all" || p.departmentId === selectedDeptId;
      const matchCat = selectedCatId === "all" || p.categoryId === selectedCatId;
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchDept && matchCat && matchStatus;
    });
  }, [performances, selectedDeptId, selectedCatId, statusFilter]);

  // Counts by department
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    performances.forEach((p) => {
      counts[p.departmentId] = (counts[p.departmentId] ?? 0) + 1;
    });
    return counts;
  }, [performances]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  return (
    <div className="space-y-6">
      {/* ── TOP ACTION BAR ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Performance &amp; Live Rating Hub
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Manual stage control · Launch live auditorium rating &amp; likes for each act and department
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/projector/timer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 shadow-xs"
            title="Open Live Stage Timer Projector in auditorium window"
          >
            <i className="bi bi-stopwatch text-amber-700 text-sm" />
            <span>Timer Projector ↗</span>
          </a>
          <Link
            href="/admin/projection"
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-900 transition hover:bg-purple-100 shadow-xs"
            title="Open Auditorium Projection Console"
          >
            <i className="bi bi-projector text-purple-600 text-sm" />
            <span>Projection Console</span>
          </Link>
          <Button onClick={openCreateDialog} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold">
            <i className="bi bi-plus-lg text-sm" />
            <span>Add Performance</span>
          </Button>
        </div>
      </div>

      {/* ── INTEGRATED LIVE STAGE VOTING & TIMER CONTROLLER ────────────────── */}
      <Card
        className={`border-2 shadow-sm transition-all ${
          isOpen ? "border-purple-500 bg-purple-50/20" : "border-slate-200 bg-white"
        }`}
      >
        <CardContent className="p-5 sm:p-6">
          {isOpen && activePerf ? (
            /* ACTIVE STAGE VOTING CONTROLLER */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    STAGE LIVE · AUDITORIUM RATING IN PROGRESS
                  </span>
                  {activePerf.departmentId && deptMap[activePerf.departmentId] && (
                    <DepartmentChip
                      name={deptMap[activePerf.departmentId].name}
                      shortName={deptMap[activePerf.departmentId].shortName}
                      color={deptMap[activePerf.departmentId].color}
                    />
                  )}
                  {activePerf.categoryId && catMap[activePerf.categoryId] && (
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                      {catMap[activePerf.categoryId].name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendVoting(30)}
                    disabled={stageActing}
                    className="h-8 text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    +30s
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendVoting(60)}
                    disabled={stageActing}
                    className="h-8 text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    +60s
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowStopDialog(true)}
                    disabled={stageActing}
                    className="h-8 text-xs font-bold"
                  >
                    <i className="bi bi-stop-fill text-sm mr-1" />
                    Stop &amp; Finalize
                  </Button>
                </div>
              </div>

              {/* Active performance spotlight */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {activePerf.imageUrl ? (
                    <img
                      src={activePerf.imageUrl}
                      alt={activePerf.name}
                      className="h-16 w-24 object-cover rounded-xl border border-purple-200 shadow-xs"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-xl">
                      🎭
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">{activePerf.name}</h3>
                    {activePerf.participants && (
                      <p className="text-xs font-semibold text-purple-700 flex items-center gap-1 mt-0.5">
                        <i className="bi bi-people-fill text-xs" />
                        <span>{activePerf.participants}</span>
                      </p>
                    )}
                    <p className="text-xs text-amber-700 font-medium mt-1">
                      🚫 <strong>{deptMap[activePerf.departmentId]?.name ?? "Performing Department"}</strong> students are blocked from rating.
                    </p>
                  </div>
                </div>

                {/* Big Live Countdown & Vote Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ratings Cast</p>
                    <p className="font-mono text-2xl font-black text-purple-900">{liveVotes}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Avg</p>
                    <p className="font-mono text-2xl font-black text-amber-600">
                      {liveAvg > 0 ? liveAvg.toFixed(2) : "—"}★
                    </p>
                    <p className="text-[10px] text-purple-600 font-bold">
                      {liveAvg > 0 ? `${((liveAvg / 5) * 100).toFixed(0)}%` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-purple-900 text-white px-5 py-2.5 shadow-md">
                    <i className="bi bi-clock-fill text-lg text-amber-300 animate-pulse" />
                    <span className="font-mono text-2xl sm:text-3xl font-black tracking-wider tabular-nums">
                      {mins}:{secs}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* IDLE STAGE CONTROLLER — Launch bar */
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <i className="bi bi-stopwatch text-lg" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Live Stage is Idle · Trigger Any Performance Card Below
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose duration below, then click &quot;▶ Launch Live Rating&quot; on any card.
                  </p>
                </div>
              </div>

              {/* Duration picker */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Timer:</span>
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setVotingDuration(d)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      votingDuration === d
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
                {votingState?.status === "closed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResetDialog(true)}
                    disabled={stageActing}
                    className="h-7 text-xs text-slate-500 hover:text-slate-800"
                  >
                    <i className="bi bi-arrow-counterclockwise text-xs mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DEPARTMENT FILTER TABS ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setSelectedDeptId("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedDeptId === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Departments ({performances.length})
          </button>
          {departments.map((d) => {
            const count = deptCounts[d.id] ?? 0;
            const isSelected = selectedDeptId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDeptId(d.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                  isSelected
                    ? "text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                }`}
                style={{
                  backgroundColor: isSelected ? d.color : undefined,
                  borderColor: isSelected ? d.color : undefined,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? "#ffffff" : d.color }}
                />
                <span>{d.shortName}</span>
                <span className="opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Category & Status secondary filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-semibold">Category:</span>
            <button
              type="button"
              onClick={() => setSelectedCatId("all")}
              className={`rounded-lg px-2.5 py-1 font-semibold ${
                selectedCatId === "all" ? "bg-purple-100 text-purple-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCatId(c.id)}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  selectedCatId === c.id ? "bg-purple-100 text-purple-800" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── PERFORMANCE CARDS GRID ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredPerformances.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600 mb-3">
            <i className="bi bi-music-note-beamed text-2xl" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Performances Added</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {selectedDeptId !== "all"
              ? "No performances created for this department yet. Click Add Performance below."
              : "Click Add Performance to schedule acts (Boys Dance, Girls Dance, Singing, etc.) manually."}
          </p>
          <Button onClick={openCreateDialog} className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold">
            <i className="bi bi-plus-lg text-sm mr-1" />
            Add Performance
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredPerformances.map((perf, index) => {
            const dept = deptMap[perf.departmentId];
            const cat = catMap[perf.categoryId];
            const isLive = isOpen && perf.id === activeId;
            const isCompleted = perf.status === "completed";

            return (
              <div
                key={perf.id}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xs transition-all hover:shadow-md ${
                  isLive
                    ? "ring-2 ring-purple-500 border-purple-400"
                    : "border-slate-200"
                }`}
              >
                {/* ── CARD COVER IMAGE / BANNER ── */}
                <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
                  {perf.imageUrl ? (
                    <img
                      src={perf.imageUrl}
                      alt={perf.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full flex-col items-center justify-center text-white"
                      style={{
                        background: dept
                          ? `linear-gradient(135deg, ${dept.color} 0%, #1E1B4B 100%)`
                          : "linear-gradient(135deg, #4F46E5 0%, #1E1B4B 100%)",
                      }}
                    >
                      <i className="bi bi-music-note-beamed text-2xl mb-1 opacity-80" />
                      <span className="text-xs font-black uppercase tracking-widest opacity-90">
                        {dept?.shortName ?? "Act"} · {cat?.name ?? "Act"}
                      </span>
                    </div>
                  )}

                  {/* Gradient shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Top-left department badge */}
                  {dept && (
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm"
                        style={{ backgroundColor: dept.color }}
                      >
                        {dept.shortName}
                      </span>
                    </div>
                  )}

                  {/* Top-right status badge */}
                  <div className="absolute top-2.5 right-2.5">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        LIVE NOW
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        <i className="bi bi-star-fill text-[10px] text-amber-300" />
                        {perf.averageRating ? perf.averageRating.toFixed(2) : "0"}★ ({perf.percentageScore ? `${perf.percentageScore.toFixed(0)}%` : "0%"})
                      </span>
                    ) : (
                      <span className="rounded-full bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-slate-200">
                        #{index + 1} Scheduled
                      </span>
                    )}
                  </div>

                  {/* Category Pill at bottom of image */}
                  {cat && (
                    <div className="absolute bottom-2 left-2.5">
                      <span className="rounded-md bg-white/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-slate-800">
                        {cat.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── CARD BODY ── */}
                <div className="flex flex-1 flex-col p-4 space-y-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1">
                      {perf.name}
                    </h4>
                    {perf.participants ? (
                      <p className="text-xs font-semibold text-purple-700 flex items-center gap-1 mt-0.5">
                        <i className="bi bi-people-fill text-xs shrink-0" />
                        <span className="truncate">{perf.participants}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">{dept?.name ?? "Department Act"}</p>
                    )}
                  </div>

                  {perf.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {perf.description}
                    </p>
                  )}

                  {/* Completed results score summary & consolidated breakdown */}
                  {isCompleted && (
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Ratings: <strong>{perf.totalVotes ?? 0}</strong></span>
                        <span className="font-extrabold text-amber-600 flex items-center gap-1">
                          <i className="bi bi-star-fill text-xs text-amber-400" />
                          {perf.averageRating ? perf.averageRating.toFixed(2) : "0"}★
                        </span>
                        <span className="font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          {perf.percentageScore ? `${perf.percentageScore.toFixed(1)}%` : "0%"}
                        </span>
                      </div>
                      {/* Star breakdown per Phase 2 spec */}
                      {(perf.totalVotes ?? 0) > 0 && (
                        <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span title="5★ = 100%">5★: {perf.rating5Count ?? 0}</span>
                          <span title="4★ = 80%">4★: {perf.rating4Count ?? 0}</span>
                          <span title="3★ = 60%">3★: {perf.rating3Count ?? 0}</span>
                          <span title="2★ = 40%">2★: {perf.rating2Count ?? 0}</span>
                          <span title="1★ = 20%">1★: {perf.rating1Count ?? 0}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Spacer to push action buttons to bottom */}
                  <div className="flex-1" />

                  {/* ── CARD ACTIONS ── */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                    {isLive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowStopDialog(true)}
                        disabled={stageActing}
                        className="h-8 text-xs font-bold flex-1"
                      >
                        <i className="bi bi-stop-fill text-sm mr-1" />
                        Stop Rating
                      </Button>
                    ) : isCompleted ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLaunchPerfTarget(perf)}
                          disabled={isOpen || stageActing}
                          className="h-8 text-xs font-semibold flex-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                          title="Re-open rating for this completed performance"
                        >
                          <i className="bi bi-arrow-clockwise text-xs mr-1" />
                          Re-Rate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResetRatingTarget(perf)}
                          disabled={isOpen || stageActing}
                          className="h-8 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50"
                          title="Reset rating: Clears all student votes and resets score to 0%"
                        >
                          <i className="bi bi-arrow-counterclockwise text-xs mr-1" />
                          Reset
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                        <Button
                          size="sm"
                          onClick={() => setLaunchPerfTarget(perf)}
                          disabled={isOpen || stageActing}
                          className="h-8 text-xs font-bold flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                          title={`Launch live rating for ${votingDuration}s`}
                        >
                          <i className="bi bi-play-fill text-sm mr-1" />
                          Launch ({votingDuration}s)
                        </Button>
                        {(perf.totalVotes ?? 0) > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResetRatingTarget(perf)}
                            disabled={isOpen || stageActing}
                            className="h-8 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50"
                            title="Reset rating: Clears all student votes and resets score to 0%"
                          >
                            <i className="bi bi-arrow-counterclockwise text-xs" />
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(perf)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
                        title="Edit Act & Photos"
                      >
                        <i className="bi bi-pencil text-sm" />
                      </Button>
                      {!isLive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(perf)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          title="Delete Performance"
                        >
                          <i className="bi bi-trash3 text-sm" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD / EDIT PERFORMANCE DIALOG ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingPerf ? "Edit Performance Card" : "Add Performance Card"}</DialogTitle>
              <DialogDescription>
                Assign team participants, respective department, category (Boys/Girls Dance, Singing, etc.), and photo cover.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2">
              {/* Department & Category Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="perf-dept">Respective Department *</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId} required>
                    <SelectTrigger id="perf-dept">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments
                        .filter((d) => d.isActive || d.id === departmentId)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: d.color }}
                              />
                              <span>{d.name} ({d.shortName})</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="perf-cat">Competition Category *</Label>
                  <Select
                    value={categoryId}
                    onValueChange={(catId) => {
                      setCategoryId(catId);
                      const selectedCat = catMap[catId];
                      const selectedDept = deptMap[departmentId];
                      if (!editingPerf && !name) {
                        if (selectedCat) {
                          setName(selectedDept ? `${selectedDept.shortName} — ${selectedCat.name}` : selectedCat.name);
                        }
                      }
                      const presetImg = getCategoryPresetImage(selectedCat?.slug, selectedCat?.name);
                      if (presetImg && (!imageUrl || PERFORMANCE_PRESET_IMAGES.some((p) => p.url === imageUrl))) {
                        setImageUrl(presetImg);
                      }
                    }}
                    required
                  >
                    <SelectTrigger id="perf-cat">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.isActive || c.id === categoryId)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Act Title */}
              <div className="space-y-1.5">
                <Label htmlFor="perf-name">Act / Performance Title *</Label>
                <Input
                  id="perf-name"
                  placeholder="e.g. IT — Boys Dance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Participants / Team Name */}
              <div className="space-y-1.5">
                <Label htmlFor="perf-participants">Participants / Performer Name</Label>
                <Input
                  id="perf-participants"
                  placeholder="e.g. Rahul & Troupe (or solo performer)"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                />
              </div>

              {/* Image URL & Upload Section */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-700">
                    <i className="bi bi-image text-purple-600 text-sm" />
                    <span>Performance Cover Image</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <i className="bi bi-upload text-xs" />
                    Upload Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                <Input
                  placeholder="Paste Image URL (https://...)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-8 text-xs bg-white"
                />

                {/* Preset suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Preview Box */}
                {imageUrl && (
                  <div className="relative aspect-16/9 w-full overflow-hidden rounded-lg border border-slate-300 mt-2">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={() => toast.error("Failed to load image preview from URL")}
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-black"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="perf-desc">Description / Song / Notes (optional)</Label>
                <Textarea
                  id="perf-desc"
                  placeholder="Song title, choreography style, or background details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingPerf ? "Save Changes" : "Create Performance Card"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Launch Rating Confirmation Dialog */}
      <ConfirmDialog
        open={!!launchPerfTarget}
        onOpenChange={(open) => !open && setLaunchPerfTarget(null)}
        title="Start Live Auditorium Rating &amp; Likes?"
        description={
          launchPerfTarget
            ? `You are about to launch live rating for "${launchPerfTarget.name}" (${
                deptMap[launchPerfTarget.departmentId]?.name ?? "Department"
              }) for ${votingDuration} seconds. All connected student screens will instantly pop up with the star and like rater.`
            : ""
        }
        confirmLabel={`Launch for ${votingDuration}s`}
        onConfirm={() => {
          if (launchPerfTarget) handleLaunchVoting(launchPerfTarget);
        }}
      />

      {/* Stop Rating Confirmation Dialog */}
      <ConfirmDialog
        open={showStopDialog}
        onOpenChange={setShowStopDialog}
        title="Stop &amp; Finalize Rating?"
        description={`Are you sure you want to stop live rating for "${activePerf?.name ?? "this act"}"? The rating window will immediately close and final average scores will be permanently locked.`}
        confirmLabel="Stop &amp; Lock Scores"
        destructive
        onConfirm={handleStopVoting}
      />

      {/* Reset Stage Confirmation Dialog */}
      <ConfirmDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        title="Reset Stage to Idle?"
        description="This will clear the current closed stage state and allow selecting a new performance to start rating."
        confirmLabel="Reset to Idle"
        onConfirm={handleResetStage}
      />

      {/* Reset Rating Confirmation Dialog */}
      <ConfirmDialog
        open={!!resetRatingTarget}
        onOpenChange={(open) => !open && setResetRatingTarget(null)}
        title="Reset Performance Rating & Votes?"
        description={`Are you sure you want to reset all ratings and votes for "${resetRatingTarget?.name}"? All student votes for this act will be cleared and the score will return to 0%. The status will be reset to Scheduled.`}
        confirmLabel="Reset Ratings"
        destructive
        onConfirm={handleResetRating}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Performance?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All ratings and data for this act will be permanently removed.`}
        confirmLabel="Delete Performance"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
