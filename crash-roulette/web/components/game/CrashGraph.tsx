"use client";
import { useRef, useEffect, useCallback } from "react";
import type { GraphPoint } from "@/lib/types";
import type { GamePhase } from "@/lib/types";

interface CrashGraphProps {
  phase: GamePhase;
  multiplier: number;
  points: GraphPoint[];
}

const COLORS = {
  running: "#818cf8", // indigo accent
  crashed: "#ff3b5c", // crash red
  cashout: "#34d399", // emerald
  grid:    "rgba(255,255,255,0.04)",
  text:    "rgba(148,163,184,0.6)", // secondary
};

export function CrashGraph({ phase, multiplier, points }: CrashGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // HiDPI / retina support
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const w = rect.width;
    const h = rect.height;
    const padX = 48;
    const padY = 24;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    ctx.clearRect(0, 0, w, h);

    // ── Grid lines ──────────────────────────────────────────────────────────
    const maxMult = Math.max(multiplier, 2.0);
    const multSteps = [1, 1.5, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000];
    const visibleSteps = multSteps.filter((s) => s <= maxMult * 1.05);

    const toY = (m: number) =>
      padY + innerH - ((m - 1) / (maxMult - 0.98)) * innerH;

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth   = 1;
    ctx.fillStyle   = COLORS.text;
    ctx.font        = "11px JetBrains Mono, monospace";
    ctx.textAlign   = "right";
    ctx.textBaseline = "middle";

    for (const step of visibleSteps) {
      const y = toY(step);
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(w - padX, y);
      ctx.stroke();
      ctx.fillText(`${step}×`, padX - 6, y);
    }

    // ── No data yet ──────────────────────────────────────────────────────────
    if (points.length < 2) {
      ctx.fillStyle   = "rgba(129,140,248,0.3)";
      ctx.font        = "14px Inter, sans-serif";
      ctx.textAlign   = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        phase === "countdown" ? "Waiting for round to start..." : "–",
        w / 2,
        h / 2
      );
      return;
    }

    const maxTime = points[points.length - 1].time || 1;
    const toX = (t: number) => padX + (t / maxTime) * innerW * 0.96;

    const lineColor = phase === "crashed" ? COLORS.crashed : COLORS.running;

    // ── Gradient fill under curve ─────────────────────────────────────────
    const gradient = ctx.createLinearGradient(0, padY, 0, h - padY);
    gradient.addColorStop(0,   phase === "crashed" ? "rgba(255,59,92,0.25)"  : "rgba(129,140,248,0.25)");
    gradient.addColorStop(1,   "rgba(0,0,0,0)");

    ctx.beginPath();
    ctx.moveTo(toX(points[0].time), toY(points[0].value));
    for (const p of points) ctx.lineTo(toX(p.time), toY(p.value));
    const lastPt = points[points.length - 1];
    ctx.lineTo(toX(lastPt.time), h - padY);
    ctx.lineTo(toX(points[0].time), h - padY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // ── Main curve ────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(toX(points[0].time), toY(points[0].value));
    for (const p of points) ctx.lineTo(toX(p.time), toY(p.value));
    ctx.strokeStyle  = lineColor;
    ctx.lineWidth    = 3;
    ctx.lineCap      = "round";
    ctx.lineJoin     = "round";
    ctx.shadowColor  = lineColor;
    ctx.shadowBlur   = phase === "crashed" ? 18 : 10;
    ctx.stroke();
    ctx.shadowBlur   = 0;

    // ── Tip dot ───────────────────────────────────────────────────────────
    const tip = points[points.length - 1];
    const tx  = toX(tip.time);
    const ty  = toY(tip.value);

    ctx.beginPath();
    ctx.arc(tx, ty, 5, 0, Math.PI * 2);
    ctx.fillStyle   = lineColor;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur  = 12;
    ctx.fill();
    ctx.shadowBlur  = 0;
  }, [phase, multiplier, points]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw on resize
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 280 }}
      aria-label={`Crash graph — current multiplier ${multiplier.toFixed(2)}x`}
    />
  );
}
