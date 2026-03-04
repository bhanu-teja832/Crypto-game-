"use client";
import type { GamePhase } from "@/lib/types";
import { MIN_BET, MAX_BET } from "@/lib/constants";

interface BetControlsProps {
  amount: string;
  setAmount: (v: string) => void;
  autoCashOut: string;
  setAutoCashOut: (v: string) => void;
  phase: GamePhase;
  hasBet: boolean;
  disabled?: boolean;
}

const QUICK_AMOUNTS = [0.05, 0.1, 0.5, 1.0];
const QUICK_MULTIPLIERS = [1.5, 2.0, 3.0, 5.0];

export function BetControls({
  amount,
  setAmount,
  autoCashOut,
  setAutoCashOut,
  phase,
  hasBet,
  disabled,
}: BetControlsProps) {
  const locked = disabled || hasBet || (phase !== "waiting" && phase !== "countdown");

  const setHalf   = () => setAmount((parseFloat(amount) / 2).toFixed(2));
  const setDouble = () =>
    setAmount(Math.min(parseFloat(amount) * 2, MAX_BET).toFixed(2));

  return (
    <div className="space-y-4">
      {/* ── Bet Amount ─────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-secondary font-medium mb-1.5 uppercase tracking-wide">
          Bet Amount (SOL)
        </label>

        <div className="flex items-center gap-2">
          {/* Half / Double */}
          <button
            onClick={setHalf}
            disabled={locked}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-border
                       text-secondary hover:text-primary hover:bg-border/80
                       disabled:opacity-40 transition-colors"
          >
            ½
          </button>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={locked}
            min={MIN_BET}
            max={MAX_BET}
            step="0.01"
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5
                       text-primary font-mono text-center text-lg font-semibold
                       focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            onClick={setDouble}
            disabled={locked}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-border
                       text-secondary hover:text-primary hover:bg-border/80
                       disabled:opacity-40 transition-colors"
          >
            ×2
          </button>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 mt-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(String(a))}
              disabled={locked}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg
                         bg-border text-secondary hover:text-accent hover:bg-border/80
                         disabled:opacity-40 transition-colors"
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* ── Auto Cash-Out ──────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs text-secondary font-medium mb-1.5 uppercase tracking-wide">
          Auto Cash-Out (×) — optional
        </label>

        <input
          type="number"
          value={autoCashOut}
          onChange={(e) => setAutoCashOut(e.target.value)}
          disabled={locked}
          placeholder="e.g. 2.00"
          min="1.01"
          step="0.1"
          className="w-full bg-background border border-border rounded-xl px-4 py-2.5
                     text-primary font-mono text-center font-semibold
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                     disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted
                     [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />

        {/* Quick multipliers */}
        <div className="flex gap-2 mt-2">
          {QUICK_MULTIPLIERS.map((m) => (
            <button
              key={m}
              onClick={() => setAutoCashOut(String(m))}
              disabled={locked}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg
                         bg-border text-secondary hover:text-accent hover:bg-border/80
                         disabled:opacity-40 transition-colors"
            >
              {m}×
            </button>
          ))}
        </div>
      </div>

      {/* ── Status hint ────────────────────────────────────────────────── */}
      {hasBet && (
        <p className="text-center text-xs text-cashout font-medium">
          ✓ Bet placed — cash out before crash!
        </p>
      )}
      {phase === "running" && !hasBet && (
        <p className="text-center text-xs text-muted">
          Betting closed for this round
        </p>
      )}
    </div>
  );
}
