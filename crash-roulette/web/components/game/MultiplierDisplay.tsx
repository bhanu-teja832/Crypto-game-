"use client";
import { useEffect, useRef } from "react";
import type { GamePhase } from "@/lib/types";

interface MultiplierDisplayProps {
  phase: GamePhase;
  multiplier: number;
  crashPoint: number | null;
  countdownEnd: number | null;
}

export function MultiplierDisplay({
  phase,
  multiplier,
  crashPoint,
  countdownEnd,
}: MultiplierDisplayProps) {
  const countdownRef = useRef<HTMLSpanElement>(null);

  // Animate countdown seconds
  useEffect(() => {
    if (phase !== "countdown" || !countdownEnd) return;

    const update = () => {
      const remaining = Math.max(0, countdownEnd - Date.now());
      const secs = (remaining / 1000).toFixed(1);
      if (countdownRef.current) countdownRef.current.textContent = `${secs}s`;
    };

    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [phase, countdownEnd]);

  // ── Waiting ────────────────────────────────────────────────────────────────
  if (phase === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6">
        <div className="text-secondary text-sm font-medium uppercase tracking-widest">
          Waiting for players
        </div>
        <div className="text-5xl font-mono font-bold text-muted animate-pulse">
          —
        </div>
      </div>
    );
  }

  // ── Countdown ──────────────────────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6">
        <div className="text-secondary text-sm font-medium uppercase tracking-widest">
          Starting in
        </div>
        <div className="text-6xl font-mono font-bold text-accent tabular-nums">
          <span ref={countdownRef}>5.0s</span>
        </div>
        <div className="text-secondary text-xs">Place your bets now!</div>
      </div>
    );
  }

  // ── Running ────────────────────────────────────────────────────────────────
  if (phase === "running") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-6">
        <div
          className="multiplier-text text-7xl font-black text-accent multiplier-running
                     tabular-nums transition-all duration-100"
          style={{ textShadow: "0 0 40px rgba(129,140,248,0.7)" }}
        >
          {multiplier.toFixed(2)}×
        </div>
        <div className="text-accent/60 text-xs font-medium uppercase tracking-widest">
          Live
        </div>
      </div>
    );
  }

  // ── Crashed ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6">
      <div className="text-crash/80 text-sm font-medium uppercase tracking-widest">
        Crashed at
      </div>
      <div
        className="multiplier-text text-7xl font-black text-crash multiplier-crashed
                   tabular-nums"
        style={{ textShadow: "0 0 50px rgba(255,59,92,0.8)" }}
      >
        {(crashPoint ?? multiplier).toFixed(2)}×
      </div>
    </div>
  );
}
