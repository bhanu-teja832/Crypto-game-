"use client";
import type { CrashHistoryEntry } from "@/lib/types";
import { CRASH_DANGER, CRASH_MEDIUM } from "@/lib/constants";

interface RoundHistoryProps {
  history: CrashHistoryEntry[];
}

function getPillStyle(crashPoint: number) {
  if (crashPoint <= CRASH_DANGER)
    return "bg-crash/20 text-crash border border-crash/30";
  if (crashPoint <= CRASH_MEDIUM)
    return "bg-warning/20 text-warning border border-warning/30";
  return "bg-cashout/20 text-cashout border border-cashout/30";
}

export function RoundHistory({ history }: RoundHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-xs text-muted text-center py-2">
        No history yet
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {history.map((entry, i) => (
        <span
          key={entry.roundId ?? i}
          className={`pill font-mono text-xs font-bold transition-all animate-fade-in ${getPillStyle(entry.crashPoint)}`}
          title={`Round #${entry.roundId} | Hash: ${entry.hash.slice(0, 12)}...`}
        >
          {entry.crashPoint.toFixed(2)}×
        </span>
      ))}
    </div>
  );
}
