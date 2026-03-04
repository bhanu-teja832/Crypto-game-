"use client";
import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/constants";
import type { LeaderboardResponse, LeaderboardEntry } from "@/lib/types";

type SortKey = "totalProfit" | "totalWagered" | "biggestWin" | "biggestMultiplier" | "gamesPlayed";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "totalProfit",      label: "Profit" },
  { key: "totalWagered",     label: "Wagered" },
  { key: "biggestWin",       label: "Biggest Win" },
  { key: "biggestMultiplier",label: "Best Multi" },
  { key: "gamesPlayed",      label: "Games" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function formatSOL(n: number) {
  return n >= 0
    ? `+${n.toFixed(3)}`
    : n.toFixed(3);
}

export default function LeaderboardPage() {
  const [sort, setSort] = useState<SortKey>("totalProfit");
  const [entries, setEntries] = useState<(LeaderboardEntry & { displayName: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/leaderboard?sort=${sort}&limit=50`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<LeaderboardResponse & { entries: (LeaderboardEntry & { displayName: string })[] }>;
      })
      .then((d) => setEntries(d.entries))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Leaderboard</h1>
        <p className="text-secondary text-sm mt-1">Top players by Solana Devnet performance</p>
      </div>

      {/* Sort tabs */}
      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sort === key
                ? "bg-accent/20 text-accent border border-accent/30"
                : "bg-border text-secondary hover:text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="card border-crash/30 text-crash text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-wide w-10">#</th>
              <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-wide">Player</th>
              <th className="px-4 py-3 text-right text-xs text-muted uppercase tracking-wide">Profit</th>
              <th className="px-4 py-3 text-right text-xs text-muted uppercase tracking-wide hidden sm:table-cell">Wagered</th>
              <th className="px-4 py-3 text-right text-xs text-muted uppercase tracking-wide hidden md:table-cell">Best ×</th>
              <th className="px-4 py-3 text-right text-xs text-muted uppercase tracking-wide hidden md:table-cell">Win %</th>
              <th className="px-4 py-3 text-right text-xs text-muted uppercase tracking-wide">Games</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  No players yet. Be the first!
                </td>
              </tr>
            ) : (
              entries.map((entry, i) => (
                <tr
                  key={entry.walletAddress}
                  className="border-b border-border/50 hover:bg-border/20 transition-colors"
                >
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {MEDALS[i] ?? `${i + 1}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-secondary">{entry.displayName}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${
                    entry.totalProfit >= 0 ? "text-cashout" : "text-crash"
                  }`}>
                    {formatSOL(entry.totalProfit)} SOL
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-secondary hidden sm:table-cell">
                    {entry.totalWagered.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-accent hidden md:table-cell">
                    {(entry.biggestMultiplier ?? 1).toFixed(2)}×
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-secondary hidden md:table-cell">
                    {((entry.winRate ?? 0) * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-right text-secondary">
                    {entry.gamesPlayed}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
