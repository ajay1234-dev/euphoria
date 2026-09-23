"use client";

import { useState, useMemo } from "react";
import { useAppConfig, usePerformances, useDepartments, useCategories } from "@/hooks/useData";
import { useProjectionState } from "@/hooks/useProjectionState";
import {
  PROJECTION_SETS,
  type ProjectionSetId,
} from "@/config/projection";
import {
  SAMPLE_PERFORMANCES_BY_SET,
  type PerfWithId,
} from "@/config/sampleResults";
import {
  OFFICIAL_DEPARTMENTS_LIST,
  SHORT_CODE_TO_DEPT_CODE,
  DEPT_CODE_TO_SHORT_CODE,
} from "@/config/departments";

export default function AdminProjectionPage() {
  const { config } = useAppConfig();
  const eventId = config?.activeEventId ?? null;

  const {
    state,
    loading: stateLoading,
    sendCommand,
    changeSet,
    toggleTestMode,
  } = useProjectionState(eventId);

  const { performances: rawPerfs, loading: perfsLoading } = usePerformances(eventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();

  const [isSending, setIsSending] = useState<string | null>(null);

  const activeSetId: ProjectionSetId = state.selectedSet || "set1";
  const activeSetConfig = PROJECTION_SETS[activeSetId] || PROJECTION_SETS.set1;
  const isTestMode = Boolean(state.isTestMode);

  // Department mapping — indexes official codes, custom Firestore colors, and short codes
  const deptMap = useMemo(() => {
    const map: Record<string, { id: string; name: string; shortName: string; color: string }> = {};

    // 1. Preload defaults
    OFFICIAL_DEPARTMENTS_LIST.forEach((d) => {
      const entry = { id: d.code, name: d.name, shortName: d.shortCode, color: d.color };
      map[d.code] = entry;
      map[d.shortCode] = entry;
      map[d.shortCode.toLowerCase()] = entry;
      map[`dept-${d.shortCode.toLowerCase()}`] = entry;
      map[d.name.toLowerCase()] = entry;
    });

    // 2. Override with live Firestore departments (so custom colors configured by admin take effect)
    departments.forEach((d) => {
      const short = (d.shortName || (d as unknown as { shortCode?: string }).shortCode || "").trim();
      const sLower = short.toLowerCase();
      const code = (d as unknown as { code?: string }).code || SHORT_CODE_TO_DEPT_CODE[sLower] || "";
      const color = d.color || "#7C3AED";
      const entry = { id: d.id, name: d.name, shortName: short || d.name, color };

      map[d.id] = entry;
      if (code) {
        map[code] = entry;
        map[code.toLowerCase()] = entry;
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

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  // Ranked performances: sorted descending for leaderboard, reverse for reveal order
  const rankedActs = useMemo(() => {
    if (isTestMode) {
      const sampleList = SAMPLE_PERFORMANCES_BY_SET[activeSetId] ?? SAMPLE_PERFORMANCES_BY_SET.set1;
      return [...sampleList].sort((a, b) => {
        const aScore = a.percentageScore ?? 0;
        const bScore = b.percentageScore ?? 0;
        return bScore - aScore;
      });
    }

    const perfs = rawPerfs as PerfWithId[];
    let list = perfs.filter(
      (p) => p.status === "completed" || p.status === "live" || (p.totalVotes ?? 0) > 0
    );

    // Filter by discipline
    const filterKey = activeSetConfig.categoryFilter;
    list = list.filter((p) => {
      const cat = p.categoryId ? catMap[p.categoryId] : null;
      const search = `${cat?.slug ?? ""} ${cat?.name ?? ""}`.toLowerCase();
      if (filterKey === "dance") return search.includes("dance");
      if (filterKey === "sing") {
        return (
          (search.includes("sing") || search.includes("vocal") || search.includes("music")) &&
          !search.includes("instrumental")
        );
      }
      if (filterKey === "instrumental") return search.includes("instrumental");
      return true;
    });

    return [...list].sort((a, b) => {
      const aScore = a.percentageScore ?? (a.averageRating ? (a.averageRating / 5) * 100 : 0);
      const bScore = b.percentageScore ?? (b.averageRating ? (b.averageRating / 5) * 100 : 0);
      if (Math.abs(bScore - aScore) > 0.001) return bScore - aScore;
      return (b.totalVotes ?? 0) - (a.totalVotes ?? 0);
    });
  }, [isTestMode, activeSetId, rawPerfs, activeSetConfig, catMap]);

  // Reveal order is from lowest score (rank = totalActs) up to 1st place
  const revealOrderActs = useMemo(() => {
    return [...rankedActs].reverse().map((act, idx) => {
      const rank = rankedActs.length - idx;
      return { ...act, revealIndex: idx + 1, rank };
    });
  }, [rankedActs]);

  const handleCommand = async (cmd: any) => {
    try {
      setIsSending(cmd);
      await sendCommand(cmd);
    } catch (err) {
      console.error("Failed to send projection command:", err);
    } finally {
      setIsSending(null);
    }
  };

  const handleSetChange = async (setId: ProjectionSetId) => {
    try {
      setIsSending(`set-${setId}`);
      await changeSet(setId);
    } catch (err) {
      console.error("Failed to change set:", err);
    } finally {
      setIsSending(null);
    }
  };

  const handleOpenProjector = () => {
    window.open(
      `/organizer/results?set=${activeSetId}&test=${isTestMode ? "true" : "false"}`,
      "EuphoriaProjector",
      "width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "Revealing Department":
      case "REVEALING_DEPT":
        return { label: "Revealing Department", bg: "bg-blue-100 text-blue-800 border-blue-300 animate-pulse" };
      case "Third Place":
      case "THIRD_PLACE":
        return { label: "Third Place", bg: "bg-amber-100 text-amber-900 border-amber-400 font-bold animate-pulse" };
      case "Playing Third Video":
        return { label: "Playing Third Video", bg: "bg-purple-100 text-purple-900 border-purple-400 font-bold animate-pulse" };
      case "Moving Third Video":
        return { label: "Moving Third Video", bg: "bg-indigo-100 text-indigo-900 border-indigo-400 font-bold animate-pulse" };
      case "Second Place":
      case "SECOND_PLACE":
        return { label: "Second Place", bg: "bg-slate-200 text-slate-900 border-slate-400 font-bold animate-pulse" };
      case "Playing Second Video":
        return { label: "Playing Second Video", bg: "bg-purple-100 text-purple-900 border-purple-400 font-bold animate-pulse" };
      case "Moving Second Video":
        return { label: "Moving Second Video", bg: "bg-indigo-100 text-indigo-900 border-indigo-400 font-bold animate-pulse" };
      case "First Place":
      case "FIRST_PLACE":
        return { label: "First Place", bg: "bg-yellow-100 text-yellow-900 border-yellow-400 font-extrabold animate-pulse" };
      case "Playing First Video":
        return { label: "Playing First Video", bg: "bg-amber-200 text-amber-950 border-amber-500 font-extrabold animate-pulse" };
      case "Moving First Video":
        return { label: "Moving First Video", bg: "bg-amber-100 text-amber-900 border-amber-400 font-bold animate-pulse" };
      case "Final Results":
      case "FINAL_RESULTS":
        return { label: "Final Results", bg: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" };
      case "Idle":
      case "IDLE":
      default:
        return { label: "Idle", bg: "bg-slate-100 text-slate-600 border-slate-200" };
    }
  };


  const stageBadge = getStageBadge(state.currentStage);
  const totalDepartments = rankedActs.length;
  const revealedSoFar = Math.min(state.currentIndex ?? 0, totalDepartments);
  const progressPercent = totalDepartments > 0 ? (revealedSoFar / totalDepartments) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--border)" }}>
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center text-xl">
              <i className="bi bi-projector" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-bricolage)", color: "var(--ink)" }}>
                Projection Command Center
              </h1>
              <p className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
                Auditorium vertical results reveal, video playback sync & stage orchestration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenProjector}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all bg-white border hover:bg-slate-50 text-slate-800"
            style={{ borderColor: "var(--border)" }}
          >
            <i className="bi bi-box-arrow-up-right text-violet-600" />
            <span>Open Projector Window</span>
          </button>
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Set Selection & Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Visual Set Selection */}
          <div className="rounded-2xl border p-5 bg-white shadow-xs" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <i className="bi bi-collection-play text-violet-600" />
                  Visual Set Selection
                </h2>
                <p className="text-xs text-slate-500">
                  Select which discipline video set is projected onto the auditorium screen
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Active: {activeSetConfig.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["set1", "set2", "set3"] as ProjectionSetId[]).map((setId) => {
                const configItem = PROJECTION_SETS[setId];
                const isSelected = activeSetId === setId;
                return (
                  <button
                    key={setId}
                    onClick={() => handleSetChange(setId)}
                    disabled={isSending !== null}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? "border-violet-600 bg-violet-50/50 shadow-sm ring-2 ring-violet-500/20"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-violet-600 ring-4 ring-violet-200" />
                    )}
                    <div className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-1">
                      {setId === "set1" ? "Dance" : setId === "set2" ? "Singing" : "Instrumental"}
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-tight">
                      {configItem.name.replace(/^Set \d: /, "")}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <i className="bi bi-camera-reels text-slate-400" />
                      <span>3 Video Overlays</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Reveal Action Hub */}
          <div className="rounded-2xl border p-5 bg-white shadow-xs" style={{ borderColor: "var(--border)" }}>
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="bi bi-play-circle text-violet-600" />
                Auditorium Reveal Controls
              </h2>
              <p className="text-xs text-slate-500">
                Send synchronized real-time playback commands to the projector screen
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* START */}
              <button
                onClick={() => handleCommand("START")}
                disabled={isSending !== null || (state.currentStage !== "Idle" && state.currentStage !== "IDLE")}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
                  state.currentStage === "Idle" || state.currentStage === "IDLE"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98]"
                    : "bg-slate-300 cursor-not-allowed opacity-60"
                }`}
              >
                <i className="bi bi-play-fill text-lg" />
                <span>Start</span>
              </button>

              {/* PAUSE */}
              <button
                onClick={() => handleCommand("PAUSE")}
                disabled={isSending !== null || state.command === "PAUSE" || state.currentStage === "Idle" || state.currentStage === "IDLE"}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm border transition-all ${
                  state.command === "PAUSE"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-[0.98]"
                }`}
              >
                <i className="bi bi-pause-fill text-lg" />
                <span>Pause</span>
              </button>

              {/* RESUME */}
              <button
                onClick={() => handleCommand("RESUME")}
                disabled={isSending !== null || state.command !== "PAUSE"}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                <i className="bi bi-play-fill text-lg text-emerald-600" />
                <span>Resume</span>
              </button>

              {/* REPLAY */}
              <button
                onClick={() => handleCommand("REPLAY")}
                disabled={isSending !== null}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                <i className="bi bi-arrow-repeat text-lg text-blue-600" />
                <span>Replay</span>
              </button>

              {/* SKIP TO FINAL */}
              <button
                onClick={() => handleCommand("SKIP_TO_FINAL")}
                disabled={isSending !== null || state.currentStage === "Final Results" || state.currentStage === "FINAL_RESULTS"}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                <i className="bi bi-skip-end-fill text-lg text-purple-600" />
                <span>Skip to Final</span>
              </button>

              {/* RESET */}
              <button
                onClick={() => handleCommand("RESET")}
                disabled={isSending !== null}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm text-red-600 bg-red-50/70 border border-red-200 hover:bg-red-100/80 transition-all active:scale-[0.98]"
              >
                <i className="bi bi-arrow-counterclockwise text-lg" />
                <span>Reset</span>
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Live Monitor & Rehearsal Mode */}
        <div className="space-y-6">
          {/* Card 3: Live Stage Status Monitor */}
          <div className="rounded-2xl border p-5 bg-white shadow-xs" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="bi bi-broadcast text-rose-500 animate-pulse" />
                Live Stage Monitor
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Synced
              </span>
            </div>

            <div className="space-y-4">
              {/* Current Stage Badge */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Current Stage
                </label>
                <div className={`px-3.5 py-2.5 rounded-xl border text-sm flex items-center justify-between ${stageBadge.bg}`}>
                  <span>{stageBadge.label}</span>
                  <span className="text-xs uppercase font-mono font-bold tracking-wider">
                    {state.command}
                  </span>
                </div>
              </div>

              {/* Progress Indicator */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Reveal Progress</span>
                  <span>{revealedSoFar} / {totalDepartments} Departments</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Active Department Revealed */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Focus
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {state.currentDepartment ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-600" />
                      {state.currentDepartment}
                      {state.currentRank && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-violet-100 text-violet-700 rounded-md">
                          Rank #{state.currentRank}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal italic">None (Waiting)</span>
                  )}
                </div>
              </div>

              {/* Rehearsal Mode Toggle */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">
                      Rehearsal Simulation
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Use 7-department sample dataset
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isTestMode}
                    onClick={() => toggleTestMode(!isTestMode)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isTestMode ? "bg-violet-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isTestMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lineup & Ranking Order Preview */}
      <div className="rounded-2xl border p-5 bg-white shadow-xs" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <i className="bi bi-list-ol text-violet-600" />
              Auditorium Reveal Lineup & Ranking Order
            </h2>
            <p className="text-xs text-slate-500">
              Departments are revealed strictly from lowest score (Order #1) up to the 1st place champion
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {totalDepartments} Departments Loaded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50" style={{ borderColor: "var(--border)" }}>
                <th className="px-4 py-3">Reveal Order</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Performance Act</th>
                <th className="px-4 py-3 text-right">Votes</th>
                <th className="px-4 py-3 text-right">Avg Stars</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-center">Rank</th>
                <th className="px-4 py-3 text-center">Celebration Overlay</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {revealOrderActs.map((act) => {
                const dept =
                  deptMap[act.departmentId] ||
                  deptMap[act.departmentId?.toLowerCase()] ||
                  (SHORT_CODE_TO_DEPT_CODE[act.departmentId?.toLowerCase()]
                    ? deptMap[SHORT_CODE_TO_DEPT_CODE[act.departmentId.toLowerCase()]]
                    : null) ||
                  (DEPT_CODE_TO_SHORT_CODE[act.departmentId]
                    ? deptMap[DEPT_CODE_TO_SHORT_CODE[act.departmentId]]
                    : null) ||
                  Object.values(deptMap).find(
                    (d) =>
                      d.id === act.departmentId ||
                      d.shortName.toLowerCase() === act.departmentId?.toLowerCase() ||
                      d.name.toLowerCase().includes(act.departmentId?.toLowerCase())
                  ) || {
                    id: act.departmentId,
                    name: act.departmentId,
                    shortName: act.departmentId,
                    color: "#6366F1",
                  };
                const score = act.percentageScore ?? 0;
                const isRevealed = (state.currentIndex ?? 0) >= act.revealIndex;
                const isCurrentlyActive = state.currentRank === act.rank;

                return (
                  <tr
                    key={act.id}
                    className={`transition-colors ${
                      isCurrentlyActive
                        ? "bg-violet-50/80 font-medium"
                        : isRevealed
                        ? "bg-slate-50/40 opacity-80"
                        : "hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Reveal Order */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700">
                        #{act.revealIndex}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: dept.color }}
                        />
                        <span className="font-bold text-slate-900">{dept.shortName}</span>
                        <span className="text-xs text-slate-500 hidden sm:inline">({dept.name})</span>
                      </div>
                    </td>

                    {/* Act */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{act.name}</div>
                      {act.participants && (
                        <div className="text-xs text-slate-500">{act.participants}</div>
                      )}
                    </td>

                    {/* Votes */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-600">
                      {act.totalVotes ?? 0}
                    </td>

                    {/* Stars */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-amber-600 font-bold">
                      ★ {(act.averageRating ?? 0).toFixed(2)}
                    </td>

                    {/* Percentage */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {score.toFixed(2)}%
                    </td>

                    {/* Rank */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          act.rank === 1
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : act.rank === 2
                            ? "bg-slate-200 text-slate-800 border border-slate-300"
                            : act.rank === 3
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {act.rank === 1 ? "🥇 1st" : act.rank === 2 ? "🥈 2nd" : act.rank === 3 ? "🥉 3rd" : `#${act.rank}`}
                      </span>
                    </td>

                    {/* Video Overlay Badge */}
                    <td className="px-4 py-3 text-center">
                      {act.rank === 1 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <i className="bi bi-trophy-fill text-amber-600" />
                          <span>Champion Video</span>
                        </span>
                      ) : act.rank === 2 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          <i className="bi bi-camera-video-fill text-slate-500" />
                          <span>2nd Video</span>
                        </span>
                      ) : act.rank === 3 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50/60 px-2 py-0.5 rounded-md border border-amber-200">
                          <i className="bi bi-camera-video-fill text-amber-600" />
                          <span>3rd Video</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
