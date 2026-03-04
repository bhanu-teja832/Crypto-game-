"use client";
import type { GamePhase } from "@/lib/types";

interface GameStatusProps {
  phase: GamePhase;
  roundId: string;
  playerCount: number;
  connected: boolean;
}

const PHASE_LABELS: Record<GamePhase, string> = {
  waiting:   "Betting Open",
  countdown: "Starting Soon",
  running:   "In Progress",
  crashed:   "Crashed",
};

const PHASE_COLORS: Record<GamePhase, string> = {
  waiting:   "text-cashout",
  countdown: "text-warning",
  running:   "text-accent",
  crashed:   "text-crash",
};

const PHASE_DOT: Record<GamePhase, string> = {
  waiting:   "bg-cashout animate-pulse",
  countdown: "bg-warning animate-pulse",
  running:   "bg-accent animate-pulse",
  crashed:   "bg-crash",
};

export function GameStatus({ phase, roundId, playerCount, connected }: GameStatusProps) {
  return (
    <div className="flex items-center justify-between text-xs">
      {/* Round info */}
      <div className="flex items-center gap-2">
        <span className="text-muted">Round</span>
        <span className="font-mono font-semibold text-secondary">#{roundId}</span>
        <span className="text-muted">·</span>
        <span className="text-secondary">{playerCount} player{playerCount !== 1 ? "s" : ""}</span>
      </div>

      {/* Phase badge */}
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${PHASE_DOT[phase]}`} />
        <span className={`font-semibold uppercase tracking-wide ${PHASE_COLORS[phase]}`}>
          {PHASE_LABELS[phase]}
        </span>
      </div>

      {/* Connection indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            connected ? "bg-cashout animate-pulse" : "bg-crash"
          }`}
        />
        <span className={connected ? "text-secondary" : "text-crash"}>
          {connected ? "Live" : "Reconnecting"}
        </span>
      </div>
    </div>
  );
}
