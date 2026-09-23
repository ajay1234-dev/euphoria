"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CelebrationOverlayProps {
  rank: 1 | 2 | 3 | null;
  videoSrc: string | null;
  departmentName?: string;
  performanceName?: string;
  visible: boolean;
  onFinished: () => void;
}

export function CelebrationOverlay({
  rank,
  videoSrc,
  departmentName,
  performanceName,
  visible,
  onFinished,
}: CelebrationOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Rank metadata
  const rankMeta = {
    1: {
      label: "1st Place Champion",
      medal: "🥇",
      badgeClass: "bg-amber-50 border-amber-400 text-amber-800",
      icon: "bi bi-trophy-fill text-amber-500",
      widthClass: "w-72 sm:w-88 md:w-96 lg:w-[430px]",
    },
    2: {
      label: "2nd Place Runner Up",
      medal: "🥈",
      badgeClass: "bg-slate-50 border-slate-300 text-slate-700",
      icon: "bi bi-award-fill text-slate-500",
      widthClass: "w-64 sm:w-72 md:w-80 lg:w-[360px]",
    },
    3: {
      label: "3rd Place Second Runner Up",
      medal: "🥉",
      badgeClass: "bg-amber-50/80 border-amber-600/50 text-amber-900",
      icon: "bi bi-award text-amber-700",
      widthClass: "w-64 sm:w-72 md:w-80 lg:w-[360px]",
    },
  }[rank ?? 1];

  useEffect(() => {
    if (!visible || !rank) {
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      return;
    }

    setLoadError(false);

    // Play video when visible
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[CelebrationOverlay] Video autoplay restricted or failed:", err);
        });
      }
    }

    // Safety timeout: Ensure the reveal sequence never hangs
    safetyTimeoutRef.current = setTimeout(() => {
      onFinished();
    }, 6500);

    return () => {
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, [visible, rank, videoSrc, onFinished]);

  const handleEnded = () => {
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    onFinished();
  };

  const handleError = () => {
    console.warn(`[CelebrationOverlay] Video failed to load (${videoSrc}). Continuing normally.`);
    setLoadError(true);
    setTimeout(() => {
      onFinished();
    }, 2000);
  };

  return (
    <AnimatePresence>
      {visible && rank && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 pointer-events-none flex flex-col items-end"
          role="status"
          aria-live="polite"
        >
          {/* Broadcast-Style Overlay Card in Lower-Right Celebration Zone */}
          <div className={`flex flex-col items-end ${rankMeta.widthClass}`}>
            {/* Header Pill */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border shadow-xl backdrop-blur-md mb-2 bg-white/95 ${rankMeta.badgeClass}`}
            >
              <span className="text-2xl">{rankMeta.medal}</span>
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-wider block">
                  {rankMeta.label}
                </span>
                <span className="text-sm font-black text-slate-900 line-clamp-1">
                  {performanceName ?? departmentName ?? "Champion Act"}
                </span>
              </div>
              <i className={`${rankMeta.icon} text-lg ml-1`} />
            </motion.div>

            {/* Video Character / Animation Area */}
            {videoSrc && !loadError ? (
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden drop-shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  key={videoSrc}
                  playsInline
                  autoPlay
                  muted
                  preload="metadata"
                  onEnded={handleEnded}
                  onError={handleError}
                  className="w-full h-full object-contain"
                >
                  {/* Prioritize WebM VP9 with Alpha */}
                  <source src={videoSrc.replace(/\.mp4$/i, ".webm")} type="video/webm" />
                  <source src={videoSrc} type="video/mp4" />
                </video>
              </div>
            ) : (
              /* Graceful Fallback Graphic */
              <div className="p-6 rounded-3xl bg-white/95 border-2 border-slate-200 shadow-2xl flex items-center gap-4 text-left">
                <span className="text-5xl">{rankMeta.medal}</span>
                <div>
                  <div className="text-xs font-black uppercase text-purple-700 tracking-wider">
                    {rankMeta.label}
                  </div>
                  <div className="text-base font-black text-slate-900">
                    {performanceName}
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {departmentName}
                  </div>
                </div>
              </div>
            )}

            {/* Live Celebration Broadcast Tag */}
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-slate-200 text-[11px] font-bold text-slate-600 shadow-xs">
              <i className="bi bi-stars text-amber-500" />
              <span>Live Results Celebration</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
