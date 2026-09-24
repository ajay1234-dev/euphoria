"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PROJECTION_SETS,
  getVideoForRank,
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
import { useProjectionState } from "@/hooks/useProjectionState";
import { usePerformances, useDepartments, useCategories } from "@/hooks/useData";
import type { ProjectionStage } from "@/types/firestore";

interface CinematicProjectorProps {
  eventId: string | null;
  forcedSetId?: ProjectionSetId;
  forcedTestMode?: boolean;
}

// Explicit Video State Machine required by specification
export type ExplicitVideoState =
  | "VIDEO_IDLE"
  | "VIDEO_FULLSCREEN_PLAYING"
  | "VIDEO_PLAYBACK_COMPLETE"
  | "VIDEO_SHRINKING"
  | "VIDEO_MOVING"
  | "VIDEO_SETTLED";

interface ActiveVideoData {
  rank: 1 | 2 | 3;
  departmentId: string;
  state: ExplicitVideoState;
  videoSrc: string;
  fallbackSrc?: string;
  targetX: number;
  targetY: number;
}

interface ConfettiParticle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  tilt: number;
  vTilt: number;
  opacity: number;
}

// ── 60 FPS HTML5 Canvas Celebration Party Paper Cannon ────────
function PartyPaperCannon({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const colors = [
      "#FFD700", // Gold
      "#FF4757", // Ruby Red
      "#2ED573", // Emerald Green
      "#1E90FF", // Dodger Blue
      "#FFA502", // Amber Orange
      "#9B59B6", // Amethyst Purple
      "#FF6B81", // Rose Pink
      "#00D2D3", // Cyan
      "#FFFFFF", // Crisp White
    ];

    const particles: ConfettiParticle[] = [];

    // Launch party cannons from left, right, and center
    const spawnBurst = (x: number, y: number, count: number, angleMin: number, angleMax: number) => {
      for (let i = 0; i < count; i++) {
        const angle = angleMin + Math.random() * (angleMax - angleMin);
        const speed = 16 + Math.random() * 24;
        particles.push({
          x,
          y,
          w: 12 + Math.random() * 14,
          h: 6 + Math.random() * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 12,
          tilt: Math.random() * 10,
          vTilt: 0.08 + Math.random() * 0.12,
          opacity: 1,
        });
      }
    };

    // Initial dual blast
    spawnBurst(width * 0.1, height * 0.95, 130, -Math.PI * 0.45, -Math.PI * 0.15);
    spawnBurst(width * 0.9, height * 0.95, 130, -Math.PI * 0.85, -Math.PI * 0.55);

    // Follow-up celebration waves
    const timer1 = setTimeout(() => {
      spawnBurst(width * 0.25, height * 0.95, 80, -Math.PI * 0.55, -Math.PI * 0.25);
      spawnBurst(width * 0.75, height * 0.95, 80, -Math.PI * 0.75, -Math.PI * 0.45);
    }, 400);

    const timer2 = setTimeout(() => {
      spawnBurst(width * 0.5, height * 0.95, 140, -Math.PI * 0.7, -Math.PI * 0.3);
    }, 900);

    let animId: number;
    let running = true;

    const render = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // gravity
        p.vx *= 0.99; // drag
        p.rotation += p.vRot;
        p.tilt += p.vTilt;
        p.opacity -= 0.0035;

        if (p.opacity <= 0 || p.y > height + 50) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.scale(Math.cos(p.tilt), 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(p.opacity, 0);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (particles.length > 0) {
        animId = requestAnimationFrame(render);
      } else {
        running = false;
        ctx.clearRect(0, 0, width, height);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      running = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("resize", onResize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}

// Web Audio synthesizer for presentation title reveal tones (No boom bass)
function playPresentationChime(rank: number, total: number) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (rank === 1) {
      // Pleasant victory fanfare triad (C5, E5, G5, C6) without any boom bass or punch thud
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.1 + idx * 0.12);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.1 + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1 + idx * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + 0.1 + idx * 0.12);
        osc.stop(ctx.currentTime + 1.9);
      });
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const baseFreq = 260;
    const stepRatio = (total - rank + 1) / Math.max(total, 1);
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq + stepRatio * 440, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch {
    // Web Audio blocked
  }
}

export function CinematicProjector({
  eventId,
  forcedSetId,
  forcedTestMode,
}: CinematicProjectorProps) {
  const { state: remoteState, reportProgress } = useProjectionState(eventId);

  const activeSetId: ProjectionSetId = forcedSetId ?? remoteState.selectedSet ?? "set1";
  const activeSetConfig = PROJECTION_SETS[activeSetId] || PROJECTION_SETS.set1;
  const isTestMode = forcedTestMode ?? Boolean(remoteState.isTestMode);

  // Firestore live data
  const { performances: rawPerfs } = usePerformances(eventId);
  const { departments } = useDepartments();
  const { categories } = useCategories();

  // Department metadata mapping — indexes all codes, shortNames, IDs, and custom colors
  const deptMap = useMemo(() => {
    const map: Record<string, { id: string; name: string; shortName: string; color: string }> = {};

    // 1. Seed with official predefined defaults
    OFFICIAL_DEPARTMENTS_LIST.forEach((d) => {
      const entry = { id: d.code, name: d.name, shortName: d.shortCode, color: d.color };
      map[d.code] = entry;
      map[d.shortCode] = entry;
      map[d.shortCode.toLowerCase()] = entry;
      map[`dept-${d.shortCode.toLowerCase()}`] = entry;
      map[d.name.toLowerCase()] = entry;
    });

    // 2. Override with live Firestore departments (so admin custom colors take effect)
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

  // Robust department resolver for sample & live events
  const resolveDept = useCallback(
    (deptId: string, actTitle?: string) => {
      if (deptMap[deptId]) return deptMap[deptId];
      if (deptMap[deptId.toLowerCase()]) return deptMap[deptId.toLowerCase()];

      const lower = deptId.toLowerCase();
      if (SHORT_CODE_TO_DEPT_CODE[lower] && deptMap[SHORT_CODE_TO_DEPT_CODE[lower]]) {
        return deptMap[SHORT_CODE_TO_DEPT_CODE[lower]];
      }
      if (DEPT_CODE_TO_SHORT_CODE[deptId] && deptMap[DEPT_CODE_TO_SHORT_CODE[deptId]]) {
        return deptMap[DEPT_CODE_TO_SHORT_CODE[deptId]];
      }

      // Match by title prefix (e.g. "IT — Dynamic Troupe" -> "IT")
      if (actTitle) {
        const prefix = (actTitle.split("—")[0] || actTitle.split("-")[0] || "").trim();
        const pLower = prefix.toLowerCase();
        if (prefix && deptMap[prefix]) return deptMap[prefix];
        if (pLower && deptMap[pLower]) return deptMap[pLower];
        if (SHORT_CODE_TO_DEPT_CODE[pLower] && deptMap[SHORT_CODE_TO_DEPT_CODE[pLower]]) {
          return deptMap[SHORT_CODE_TO_DEPT_CODE[pLower]];
        }
      }

      // Search all entries
      const found = Object.values(deptMap).find(
        (d) =>
          d.id === deptId ||
          d.shortName.toLowerCase() === lower ||
          d.name.toLowerCase().includes(lower)
      );
      if (found) return found;

      return {
        id: deptId,
        name: deptId,
        shortName: deptId.toUpperCase(),
        color: "#7C3AED",
      };
    },
    [deptMap]
  );

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  // Ranked performances sorted descending (Score: 100% -> 0%)
  const rankedActs = useMemo(() => {
    if (isTestMode) {
      const sampleList = SAMPLE_PERFORMANCES_BY_SET[activeSetId] ?? SAMPLE_PERFORMANCES_BY_SET.set1;
      return [...sampleList].sort((a, b) => {
        const aScore = a.percentageScore ?? 0;
        const bScore = b.percentageScore ?? 0;
        return bScore - aScore;
      });
    }

    const perfs = (rawPerfs as PerfWithId[]) || [];
    let list = perfs.filter(
      (p) => p.status === "completed" || p.status === "live" || (p.totalVotes ?? 0) > 0
    );

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

  // Sequential Reveal Order: strictly from lowest score up to 1st place
  const revealOrderActs = useMemo(() => {
    return [...rankedActs].reverse().map((act, idx) => {
      const rank = rankedActs.length - idx;
      return { ...act, revealIndex: idx, rank };
    });
  }, [rankedActs]);

  // Projector Presentation Mode
  const [screenState, setScreenState] = useState<"BLANK" | "REVEALING" | "FINAL_RESULTS">("BLANK");
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  // Department Presentation Title Animation
  const [labelPhase, setLabelPhase] = useState<"NONE" | "CENTER" | "MOVING_TO_BAR">("NONE");
  const [activeLabelDept, setActiveLabelDept] = useState<{
    id: string;
    name: string;
    shortName: string;
    color: string;
    rank: number;
    colX: number;
    colY: number;
  } | null>(null);

  // Celebration Videos state: indexed by rank (3, 2, 1)
  const [videosByRank, setVideosByRank] = useState<Record<number, ActiveVideoData>>({});

  // Grand Finale Celebration Party Paper Confetti
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Audio permission handling
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const unlockAudio = useCallback(() => {
    if (audioUnlocked) return;
    setAudioUnlocked(true);
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") ctx.resume();
      }
    } catch {}
  }, [audioUnlocked]);

  useEffect(() => {
    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [unlockAudio]);

  // Column DOM references for pixel coordinate calculations
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const videoAnchorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeVideoElRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeqIdRef = useRef<string | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const runNextStepRef = useRef<(stepIndex: number) => void>(() => {});
  const currentStepIndexRef = useRef<number>(0);

  // Idle cursor auto-hide after 2.5s
  const [cursorHidden, setCursorHidden] = useState<boolean>(false);
  const cursorTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseMove = () => {
      setCursorHidden(false);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = setTimeout(() => {
        setCursorHidden(true);
      }, 2500);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    };
  }, []);

  // Keyboard shortcut 'f' for full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Calculate precise destination coordinates for label and video
  const getColumnAnchors = useCallback((departmentId: string, actId?: string) => {
    const el =
      (actId ? columnRefs.current[actId] : null) ||
      columnRefs.current[departmentId] ||
      columnRefs.current[departmentId.toLowerCase()] ||
      (SHORT_CODE_TO_DEPT_CODE[departmentId.toLowerCase()]
        ? columnRefs.current[SHORT_CODE_TO_DEPT_CODE[departmentId.toLowerCase()]]
        : null) ||
      (DEPT_CODE_TO_SHORT_CODE[departmentId]
        ? columnRefs.current[DEPT_CODE_TO_SHORT_CODE[departmentId]]
        : null);

    const anchorEl =
      (actId ? videoAnchorRefs.current[actId] : null) ||
      videoAnchorRefs.current[departmentId] ||
      videoAnchorRefs.current[departmentId.toLowerCase()] ||
      (SHORT_CODE_TO_DEPT_CODE[departmentId.toLowerCase()]
        ? videoAnchorRefs.current[SHORT_CODE_TO_DEPT_CODE[departmentId.toLowerCase()]]
        : null) ||
      (DEPT_CODE_TO_SHORT_CODE[departmentId]
        ? videoAnchorRefs.current[DEPT_CODE_TO_SHORT_CODE[departmentId]]
        : null);

    if (!el || typeof window === "undefined") {
      return { colX: 0, colY: 0, targetX: 0, targetY: 0 };
    }
    const rect = el.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Center of column bottom (where department name sits)
    const labelDestX = rect.left + rect.width / 2;
    const labelDestY = rect.bottom - 40;

    // Center of designated video slot directly ABOVE the percentage badge
    let videoDestX = rect.left + rect.width / 2;
    let videoDestY = rect.top + 45;

    if (anchorEl) {
      const aRect = anchorEl.getBoundingClientRect();
      videoDestX = aRect.left + aRect.width / 2;
      videoDestY = aRect.top + aRect.height / 2;
    }

    return {
      colX: labelDestX - centerX,
      colY: labelDestY - centerY,
      targetX: videoDestX - centerX,
      targetY: videoDestY - centerY,
    };
  }, []);

  // ── Step-by-Step Reveal Orchestration ─────────────────────────
  const runNextStep = useCallback(
    (stepIndex: number) => {
      const total = revealOrderActs.length;
      if (stepIndex >= total) {
        setScreenState("FINAL_RESULTS");
        setLabelPhase("NONE");
        setActiveLabelDept(null);
        reportProgress("Final Results", null, null, total);
        return;
      }

      const act = revealOrderActs[stepIndex];
      const dept = resolveDept(act.departmentId, (act as any).name || (act as any).title);
      const rank = act.rank;

      setActiveStepIndex(stepIndex);
      currentStepIndexRef.current = stepIndex;
      const anchors = getColumnAnchors(act.departmentId, act.id);

      const stageLabel: ProjectionStage =
        rank === 3
          ? "Third Place"
          : rank === 2
          ? "Second Place"
          : rank === 1
          ? "First Place"
          : "Revealing Department";

      reportProgress(stageLabel, dept.shortName, rank, stepIndex + 1);
      playPresentationChime(rank, total);

      // Title appears huge in center of projector with full-screen department color background
      setActiveLabelDept({
        id: act.departmentId,
        name: dept.name,
        shortName: dept.shortName,
        color: dept.color,
        rank,
        colX: anchors.colX,
        colY: anchors.colY,
      });
      setLabelPhase("CENTER");

      // Hold briefly (~1.2s), then the visual text element shrinks and moves to bar
      timerRef.current = setTimeout(() => {
        setLabelPhase("MOVING_TO_BAR");

        // Once label arrives at bar column (~750ms):
        timerRef.current = setTimeout(() => {
          setLabelPhase("NONE");

          // ── TOP 3 PODIUM RANKS (3rd, 2nd, 1st place): CELEBRATION VIDEO PLAYS NOW! ──
          if (rank <= 3) {
            const videoAssets = getVideoForRank(activeSetId, rank as 1 | 2 | 3);
            const playingStage: ProjectionStage =
              rank === 3
                ? "Playing Third Video"
                : rank === 2
                ? "Playing Second Video"
                : "Playing First Video";

            reportProgress(playingStage, dept.shortName, rank, stepIndex + 1);

            setVideosByRank((prev) => ({
              ...prev,
              [rank]: {
                rank: rank as 1 | 2 | 3,
                departmentId: act.departmentId,
                state: "VIDEO_FULLSCREEN_PLAYING",
                videoSrc: videoAssets.src,
                fallbackSrc: videoAssets.fallback,
                targetX: anchors.targetX,
                targetY: anchors.targetY,
              },
            }));
            return;
          }

          // ── NON-PODIUM RANKS (Ranks > 3): Vertical bar and percentage grow ──
          setRevealedIndices((prev) => (prev.includes(stepIndex) ? prev : [...prev, stepIndex]));

          // Let bar and percentage counter reach final value (~1500ms), hold briefly (~800ms), advance
          timerRef.current = setTimeout(() => {
            runNextStepRef.current(stepIndex + 1);
          }, 2300);
        }, 750);
      }, 1200);
    },
    [revealOrderActs, resolveDept, getColumnAnchors, activeSetId, reportProgress]
  );

  useEffect(() => {
    runNextStepRef.current = runNextStep;
  }, [runNextStep]);

  // ── Video Event Handler (Triggered ONLY when celebration video ends) ─────
  const handleVideoEnded = useCallback(
    (rank: 1 | 2 | 3) => {
      const stepIdx = currentStepIndexRef.current;
      const movingStage: ProjectionStage =
        rank === 3
          ? "Moving Third Video"
          : rank === 2
          ? "Moving Second Video"
          : "Moving First Video";

      const act = revealOrderActs.find((a) => a.rank === rank);
      const dept = act ? resolveDept(act.departmentId, (act as any).name || (act as any).title) : null;

      reportProgress(movingStage, dept?.shortName ?? null, rank, stepIdx + 1);

      // Step 1: Transition VIDEO_FULLSCREEN_PLAYING -> VIDEO_SHRINKING
      setVideosByRank((prev) => {
        const item = prev[rank];
        if (!item) return prev;
        return {
          ...prev,
          [rank]: { ...item, state: "VIDEO_SHRINKING" },
        };
      });

      // Step 2: Animate scale down (500ms), then translate to target column (VIDEO_MOVING)
      timerRef.current = setTimeout(() => {
        setVideosByRank((prev) => {
          const item = prev[rank];
          if (!item) return prev;
          return {
            ...prev,
            [rank]: { ...item, state: "VIDEO_MOVING" },
          };
        });

        // Step 3: Video settles directly above the podium bar
        timerRef.current = setTimeout(() => {
          setVideosByRank((prev) => {
            const item = prev[rank];
            if (!item) return prev;
            return {
              ...prev,
              [rank]: { ...item, state: "VIDEO_SETTLED" },
            };
          });

          // ── NOW: THE BAR INCREASES AND PERCENTAGE COUNTS UP! ──
          if (act) {
            playPresentationChime(rank, revealOrderActs.length);
            if (rank === 1) {
              setShowConfetti(true);
            }
            setRevealedIndices((prev) => (prev.includes(stepIdx) ? prev : [...prev, stepIdx]));
          }

          // Let bar and percentage complete, then advance to final results
          timerRef.current = setTimeout(() => {
            runNextStepRef.current(stepIdx + 1);
          }, rank === 1 ? 5500 : 2000);
        }, 850);
      }, 500);
    },
    [revealOrderActs, resolveDept, reportProgress]
  );


  // ── Remote Firestore Command Synchronization ─────────────────
  useEffect(() => {
    const cmd = remoteState.command;
    const seqId = remoteState.revealSequenceId;

    if (cmd === "RESET") {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (activeVideoElRef.current) {
        activeVideoElRef.current.pause();
        activeVideoElRef.current.currentTime = 0;
      }
      setShowConfetti(false);
      setScreenState("BLANK");
      setRevealedIndices([]);
      setActiveStepIndex(-1);
      setLabelPhase("NONE");
      setActiveLabelDept(null);
      setVideosByRank({});
      isPausedRef.current = false;
      reportProgress("Idle", null, null, 0);
      return;
    }

    if (cmd === "SKIP_TO_FINAL") {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (activeVideoElRef.current) {
        activeVideoElRef.current.pause();
      }
      setShowConfetti(true);
      setScreenState("FINAL_RESULTS");
      setRevealedIndices(revealOrderActs.map((_, i) => i));
      setLabelPhase("NONE");
      setActiveLabelDept(null);
      isPausedRef.current = false;

      // Position all 3 celebration videos settled above their respective bars
      const settledBatch: Record<number, ActiveVideoData> = {};
      [3, 2, 1].forEach((r) => {
        const act = revealOrderActs.find((a) => a.rank === r);
        if (act) {
          const anchors = getColumnAnchors(act.departmentId, act.id);
          const assets = getVideoForRank(activeSetId, r as 1 | 2 | 3);
          settledBatch[r] = {
            rank: r as 1 | 2 | 3,
            departmentId: act.departmentId,
            state: "VIDEO_SETTLED",
            videoSrc: assets.src,
            fallbackSrc: assets.fallback,
            targetX: anchors.targetX,
            targetY: anchors.targetY,
          };
        }
      });
      setVideosByRank(settledBatch);
      reportProgress("Final Results", null, null, revealOrderActs.length);
      return;
    }

    if (cmd === "PAUSE") {
      isPausedRef.current = true;
      if (activeVideoElRef.current) {
        activeVideoElRef.current.pause();
      }
      return;
    }

    if (cmd === "RESUME") {
      isPausedRef.current = false;
      if (activeVideoElRef.current) {
        activeVideoElRef.current.play().catch(() => {});
      }
      return;
    }

    if ((cmd === "START" || cmd === "REPLAY") && seqId && seqId !== lastSeqIdRef.current) {
      lastSeqIdRef.current = seqId;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (activeVideoElRef.current) {
        activeVideoElRef.current.pause();
        activeVideoElRef.current.currentTime = 0;
      }

      setShowConfetti(false);
      setScreenState("REVEALING");
      setRevealedIndices([]);
      setActiveStepIndex(-1);
      setLabelPhase("NONE");
      setActiveLabelDept(null);
      setVideosByRank({});
      isPausedRef.current = false;

      // Start sequential reveal after initial breath (600ms)
      timerRef.current = setTimeout(() => {
        runNextStep(0);
      }, 600);
    }
  }, [
    remoteState.command,
    remoteState.revealSequenceId,
    revealOrderActs,
    runNextStep,
    getColumnAnchors,
    activeSetId,
    reportProgress,
  ]);

  // ── 1. INITIAL STATE: ABSOLUTELY BLANK SCREEN ────────────────
  if (screenState === "BLANK") {
    return (
      <div
        className={`w-screen h-screen bg-white flex items-center justify-center select-none overflow-hidden ${
          cursorHidden ? "cursor-none" : ""
        }`}
      >
        {/* Hidden celebration video preloader for active set (eliminates video lagging/decoding delay) */}
        <div className="hidden pointer-events-none select-none" aria-hidden="true">
          {([1, 2, 3] as const).map((r) => {
            const assets = getVideoForRank(activeSetId, r);
            return (
              <div key={`preload-blank-${activeSetId}-${r}`}>
                <video src={assets.src} preload="auto" muted playsInline />
                {assets.fallback && (
                  <video src={assets.fallback} preload="auto" muted playsInline />
                )}
              </div>
            );
          })}
        </div>

        {/* Subtle audio enablement prompt if user hasn't clicked window yet */}
        {!audioUnlocked && (
          <div className="text-slate-400 text-xs font-mono tracking-widest uppercase animate-pulse select-none">
            Click anywhere to prime audio
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-screen h-screen bg-white text-[#1C1533] flex flex-col justify-end p-6 sm:p-10 select-none overflow-hidden relative ${
        cursorHidden ? "cursor-none" : ""
      }`}
    >
      {/* Hidden celebration video preloader for active set (eliminates video lagging/decoding delay) */}
      <div className="hidden pointer-events-none select-none" aria-hidden="true">
        {([1, 2, 3] as const).map((r) => {
          const assets = getVideoForRank(activeSetId, r);
          return (
            <div key={`preload-active-${activeSetId}-${r}`}>
              <video src={assets.src} preload="auto" muted playsInline />
              {assets.fallback && (
                <video src={assets.fallback} preload="auto" muted playsInline />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Dynamic Full-Screen Department Background Overlay ── */}
      <AnimatePresence>
        {labelPhase !== "NONE" && activeLabelDept && (
          <motion.div
            key={`dept-bg-overlay-${activeLabelDept.id}`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: labelPhase === "CENTER" ? 1 : 0,
            }}
            transition={{
              duration: labelPhase === "CENTER" ? 0.35 : 0.75,
              ease: [0.16, 1, 0.3, 1],
            }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="fixed inset-0 z-30 pointer-events-none"
            style={{ backgroundColor: activeLabelDept.color }}
          />
        )}
      </AnimatePresence>

      {/* ── Auditorium Top Header Title (Dance Championship, etc.) ── */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute top-6 sm:top-8 inset-x-0 flex flex-col items-center justify-center text-center pointer-events-none z-20 px-4"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200/90 shadow-sm mb-2">
          <i className="bi bi-trophy-fill text-amber-500 text-sm" />
          <span className="font-heading text-xs sm:text-sm tracking-widest uppercase text-slate-800 font-bold">
            Euphoria 2026
          </span>
          <span className="text-slate-300 font-bold">·</span>
          <span className="text-xs sm:text-sm font-bold text-violet-600">
            {activeSetId === "set1" ? "Dance Stage" : activeSetConfig.discipline}
          </span>
        </div>
        <h1
          className="font-heading text-3xl sm:text-5xl md:text-6xl text-[#1C1533] tracking-tight font-extrabold drop-shadow-xs"
        >
          {activeSetId === "set1"
            ? "Dance Performance Results"
            : `${activeSetConfig.discipline} Results`}
        </h1>
      </motion.div>

      {/* ── 2. VERTICAL BAR CHART ── */}
      <div className="flex items-end justify-center gap-4 sm:gap-8 md:gap-12 w-full max-w-7xl mx-auto px-4 pb-4 z-10">
        {revealOrderActs.map((act, idx) => {
          const dept = resolveDept(act.departmentId, (act as any).name || (act as any).title);
          const isRevealed = revealedIndices.includes(idx);
          const score = act.percentageScore ?? (act.averageRating ? (act.averageRating / 5) * 100 : 0);
          const rank = act.rank;

          return (
            <div
              key={act.id}
              ref={(el) => {
                if (act.id) columnRefs.current[act.id] = el;
                if (act.departmentId) {
                  columnRefs.current[act.departmentId] = el;
                  columnRefs.current[act.departmentId.toLowerCase()] = el;
                }
              }}
              className={`flex-1 flex flex-col items-center justify-end h-full max-w-[125px] relative transition-opacity duration-300 ${
                isRevealed ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Space reserved above bar for settled video and percentage */}
              <div className="flex flex-col items-center justify-end mb-2.5 relative w-full">
                {/* Dedicated Anchor Slot for 3D character video (ranks 3, 2, 1) */}
                <div
                  ref={(el) => {
                    if (act.id) videoAnchorRefs.current[act.id] = el;
                    if (act.departmentId) {
                      videoAnchorRefs.current[act.departmentId] = el;
                      videoAnchorRefs.current[act.departmentId.toLowerCase()] = el;
                    }
                  }}
                  className="h-24 w-full flex items-center justify-center relative pointer-events-none"
                />

                {/* Bold, Highly Visible Progressive Percentage Counter (cleanly below video, above bar) */}
                <div className="h-11 flex items-center justify-center relative w-full z-20">
                  {isRevealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.4 }}
                      className="inline-flex items-center justify-center px-3.5 py-1 rounded-2xl bg-white shadow-lg border-2 tabular-nums"
                      style={{
                        borderColor: dept.color,
                        boxShadow: `0 6px 20px -2px ${dept.color}35`,
                      }}
                    >
                      <span
                        className="text-lg sm:text-2xl md:text-3xl font-heading font-bold tracking-tight drop-shadow-xs"
                        style={{ color: dept.color }}
                      >
                        <AnimatedPercentageCounter value={score} duration={1400} />
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Strictly Vertical Bar Container */}
              <div className="w-12 sm:w-16 md:w-20 h-[48vh] bg-slate-100 rounded-t-2xl flex flex-col justify-end p-1 relative overflow-hidden border border-slate-200/90 shadow-inner">
                {/* Visual bar baseline guides */}
                <div className="absolute inset-x-0 bottom-1/4 border-b border-dashed border-slate-300/60 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-2/4 border-b border-dashed border-slate-300/60 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-3/4 border-b border-dashed border-slate-300/60 pointer-events-none" />

                {/* The Rising Vertical Bar (0% -> Actual percentage) */}
                {isRevealed && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${score > 0 ? Math.min(Math.max(score, 4), 100) : 0}%` }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full rounded-t-xl relative shadow-md"
                    style={{ backgroundColor: dept.color }}
                  >
                    {/* Subtle top specular shine */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/35 rounded-t-xl" />
                  </motion.div>
                )}
              </div>

              {/* Department Baseline Label: Clean and Professional Title Alone */}
              <div className="w-full text-center mt-3 pt-2 border-t border-slate-200">
                <div
                  className="font-heading text-lg sm:text-2xl font-bold tracking-wide leading-tight"
                  style={{ color: dept.color }}
                >
                  {dept.shortName}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. BIG DEPARTMENT NAME (Center -> Shrink -> Move to Bar) ── */}
      <AnimatePresence>
        {labelPhase !== "NONE" && activeLabelDept && (
          <motion.div
            key={`title-${activeLabelDept.id}`}
            initial={{ opacity: 0, scale: 0.65, x: 0, y: 0 }}
            animate={
              labelPhase === "CENTER"
                ? {
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.45, ease: "easeOut" },
                  }
                : {
                    opacity: 1,
                    scale: 0.28,
                    x: activeLabelDept.colX,
                    y: activeLabelDept.colY,
                    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
                  }
            }
            exit={{ opacity: 0, scale: 0.2 }}
            className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-40"
          >
            <div className="flex flex-col items-center text-center">
              <motion.span
                initial={{ color: "#FFFFFF" }}
                animate={{
                  color: labelPhase === "CENTER" ? "#FFFFFF" : activeLabelDept.color,
                }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="font-heading text-7xl sm:text-8xl md:text-9xl tracking-normal drop-shadow-[0_8px_32px_rgba(0,0,0,0.45)] font-black uppercase"
              >
                {activeLabelDept.shortName}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 4. CELEBRATION VIDEOS (Fullscreen -> Shrink -> Move -> Settle) ── */}
      {/* Renders each podium video (3, 2, 1) using the EXACT SAME video element */}
      {([3, 2, 1] as const).map((r) => {
        const videoData = videosByRank[r];
        if (!videoData) return null;

        const isFullscreen = videoData.state === "VIDEO_FULLSCREEN_PLAYING";
        const isShrinking = videoData.state === "VIDEO_SHRINKING";
        const isMoving = videoData.state === "VIDEO_MOVING";
        const isSettled = videoData.state === "VIDEO_SETTLED";

        return (
          <motion.div
            key={`celebration-video-${r}`}
            initial={{ opacity: 0, scale: 0.85, x: 0, y: 0 }}
            animate={
              isFullscreen
                ? {
                    opacity: 1,
                    scale: 1.0,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.45, ease: "easeOut" },
                  }
                : isShrinking
                ? {
                    opacity: 1,
                    scale: 0.35,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                  }
                : isMoving || isSettled
                ? {
                    opacity: 1,
                    scale: 0.35,
                    x: videoData.targetX,
                    y: videoData.targetY,
                    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
                  }
                : { opacity: 0 }
            }
            className={`fixed inset-0 flex items-center justify-center pointer-events-none transform-gpu ${
              isFullscreen ? "z-50" : "z-15"
            }`}
            style={{
              transform: "translate3d(0,0,0)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              willChange: "transform, opacity",
            }}
          >
            <div className="relative flex flex-col items-center">
              <video
                ref={(el) => {
                  if (isFullscreen) activeVideoElRef.current = el;
                }}
                src={videoData.videoSrc}
                autoPlay
                playsInline
                preload="auto"
                disablePictureInPicture
                disableRemotePlayback
                muted={!isFullscreen} // Audio allowed unmuted during main fullscreen reveal!
                loop={isSettled}
                onError={() => {
                  console.warn(`Video playback error for rank ${r}, advancing safely`);
                  handleVideoEnded(r);
                }}
                onEnded={() => {
                  if (isFullscreen) handleVideoEnded(r);
                }}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  // Fallback if browser ends within 100ms
                  if (isFullscreen && el.duration > 0 && el.currentTime >= el.duration - 0.1) {
                    handleVideoEnded(r);
                  }
                }}
                className={`object-contain transition-all duration-300 transform-gpu ${
                  isFullscreen
                    ? "w-[92vw] max-w-[850px] max-h-[68vh] drop-shadow-2xl"
                    : "w-[240px] h-[120px] drop-shadow-md"
                }`}
                style={{
                  transform: "translate3d(0,0,0)",
                  backfaceVisibility: "hidden",
                }}
              >
                {videoData.fallbackSrc && (
                  <source src={videoData.fallbackSrc} type="video/mp4" />
                )}
              </video>
            </div>
          </motion.div>
        );
      })}

      {/* ── 5. FULL-SCREEN CELEBRATION PARTY PAPER CONFETTI CANNON ── */}
      <PartyPaperCannon active={showConfetti} />

    </div>
  );
}

// ── Smooth Decimal Percentage Counter (Progressive from 0% -> Score%) ──
function AnimatedPercentageCounter({
  value,
  duration = 1400,
}: {
  value: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const animatedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (value <= 0) {
      setDisplayValue(0);
      return;
    }

    if (animatedRef.current) {
      setDisplayValue(value);
      return;
    }

    let animId: number;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Quartic ease-out curve matching Framer Motion's rising bar animation
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = value * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        animatedRef.current = true;
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [value, duration]);

  return <span>{displayValue.toFixed(2)}%</span>;
}
