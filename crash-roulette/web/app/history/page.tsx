"use client";
import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";
import { CRASH_DANGER, CRASH_MEDIUM } from "@/lib/constants";

function CrashPill({ value }: { value: number }) {
  const style =
    value <= CRASH_DANGER ? "pill-crash" :
    value <= CRASH_MEDIUM ? "bg-warning/20 text-warning pill" :
                            "pill-cashout";
  return <span className={style}>{value.toFixed(2)}×</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoryPage() {
  const {
    rounds, total, page, totalPages,
    loading, error,
    nextPage, prevPage, refresh,
  } = useHistory({ pageSize: 25, autoRefresh: true, refreshIntervalMs: 15_000 });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Game History</h1>
          <p className="text-secondary text-sm mt-1">
            {total.toLocaleString()} rounds played
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-primary text-sm px-4 py-2"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-crash/30 text-crash text-sm p-4">
          Failed to load history: {error}
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-wide">Round</th>
              <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-wide">Crash</th>
              <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-wide hidden sm:table-cell">Players</th>
              <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-wide hidden md:table-cell">Total Bets</th>
              <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-wide hidden md:table-cell">Payout</th>
              <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left text-xs text-muted uppercase tracking-wide">Verify</th>
            </tr>
          </thead>
          <tbody>
            {loading && rounds.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  Loading...
                </td>
              </tr>
            ) : rounds.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  No rounds yet. Start playing!
                </td>
              </tr>
            ) : (
              rounds.map((round, i) => (
                <tr
                  key={round.id}
                  className={`border-b border-border/50 hover:bg-border/20 transition-colors ${
                    i % 2 === 0 ? "" : "bg-surface/50"
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-secondary">
                    #{round.roundNumber}
                  </td>
                  <td className="px-4 py-3">
                    <CrashPill value={round.crashPoint} />
                  </td>
                  <td className="px-4 py-3 text-secondary hidden sm:table-cell">
                    {round.playerCount}
                  </td>
                  <td className="px-4 py-3 font-mono text-secondary hidden md:table-cell">
                    {round.totalBets.toFixed(3)} SOL
                  </td>
                  <td className="px-4 py-3 font-mono text-secondary hidden md:table-cell">
                    {round.totalPayout.toFixed(3)} SOL
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {formatDate(round.crashedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/fairness?hash=${round.seedHash}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Verify
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prevPage}
            disabled={page <= 1 || loading}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-secondary text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={page >= totalPages || loading}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
