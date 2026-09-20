"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
}

const FEST_COLORS = [
  "#9333EA", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber / Gold
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#6366F1", // Indigo
  "#F43F5E", // Rose
  "#8B5CF6", // Violet
  "#EAB308", // Yellow
];

export function Confetti({ duration = 4000 }: { duration?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particleCount = Math.min(140, Math.floor(width / 9));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: -20 - Math.random() * (height * 0.5),
        w: 8 + Math.random() * 8,
        h: 5 + Math.random() * 10,
        color: FEST_COLORS[Math.floor(Math.random() * FEST_COLORS.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.08,
      });
    }

    let animationFrameId: number;
    const startTime = Date.now();

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      // Stop once duration has completed
      if (progress >= 1) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      // Begin fadeout in the last 25% of duration
      const globalFade = progress > 0.75 ? 1 - (progress - 0.75) / 0.25 : 1;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(p.wobble) * 1.5;
        p.y += p.vy;
        p.wobble += p.wobbleSpeed;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.scale(Math.cos(p.wobble), 1);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * globalFade;

        // Draw paper rectangle
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

        ctx.restore();

        // Recycle particle if it falls off the bottom before duration completes
        if (p.y > height + 20 && progress < 0.6) {
          p.x = Math.random() * width;
          p.y = -20;
          p.vy = 2 + Math.random() * 4;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [duration]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
