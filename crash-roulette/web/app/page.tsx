"use client";
import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getSocket } from "@/lib/socket";
import { useGame } from "@/hooks/useGame";
import { useBet } from "@/hooks/useBet";
import { useSound } from "@/hooks/useSound";
import { useToast } from "@/components/ui/Toast";

import { CrashGraph } from "@/components/game/CrashGraph";
import { MultiplierDisplay } from "@/components/game/MultiplierDisplay";
import { BetControls } from "@/components/game/BetControls";
import { CashOutButton } from "@/components/game/CashOutButton";
import { GameStatus } from "@/components/game/GameStatus";
import { RoundHistory } from "@/components/game/RoundHistory";
import { PlayerList } from "@/components/players/PlayerList";

export default function GamePage() {
  const { publicKey } = useWallet();
  const { success, error } = useToast();
  const { playTick, playCrash, playCashout, playCountdown, muted, toggleMute } = useSound();

  // ── Game state ──────────────────────────────────────────────────────────────
  const {
    phase,
    multiplier,
    crashPoint,
    players,
    history,
    countdownEnd,
    connected,
    graphPoints,
    roundId,
  } = useGame();

  // ── Bet management ──────────────────────────────────────────────────────────
  const {
    amount,
    setAmount,
    autoCashOut,
    setAutoCashOut,
    placeBet,
    cashOut,
    resetForNewRound,
    isPlacing,
    isCashingOut,
    hasBet,
    canBet,
    canCashOut,
  } = useBet({
    phase,
    onSuccess: success,
    onError:   error,
  });

  // Reset bet state on new round
  useEffect(() => {
    resetForNewRound(roundId);
  }, [roundId, resetForNewRound]);

  // Authenticate wallet with server
  useEffect(() => {
    if (!publicKey) return;
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("auth:wallet", publicKey.toBase58());
    }
  }, [publicKey, connected]);

  // Sound effects
  useEffect(() => {
    if (phase === "running") playTick();
  }, [multiplier, phase, playTick]);

  useEffect(() => {
    if (phase === "crashed") playCrash();
    if (phase === "countdown") playCountdown();
  }, [phase, playCrash, playCountdown]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Status bar */}
      <GameStatus
        phase={phase}
        roundId={roundId}
        playerCount={players.length}
        connected={connected}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left: Graph + Multiplier ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Graph card */}
          <div className="card p-0 overflow-hidden">
            <div
              className={`transition-all duration-500 ${
                phase === "crashed" ? "border border-crash/30" :
                phase === "running" ? "border border-accent/20" :
                ""
              } rounded-2xl`}
            >
              <MultiplierDisplay
                phase={phase}
                multiplier={multiplier}
                crashPoint={crashPoint}
                countdownEnd={countdownEnd}
              />
              <div className="px-4 pb-4">
                <CrashGraph
                  phase={phase}
                  multiplier={multiplier}
                  points={graphPoints}
                />
              </div>
            </div>
          </div>

          {/* Recent rounds */}
          <div className="card">
            <div className="text-xs text-muted uppercase tracking-widest font-semibold mb-3">
              Recent Rounds
            </div>
            <RoundHistory history={history} />
          </div>
        </div>

        {/* ── Right: Bet panel + Players ────────────────────────────────── */}
        <div className="space-y-4">

          {/* Bet panel */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">Place Bet</span>
              {/* Mute toggle */}
              <button
                onClick={toggleMute}
                className="text-muted hover:text-secondary transition-colors text-lg"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </div>

            <BetControls
              amount={amount}
              setAmount={setAmount}
              autoCashOut={autoCashOut}
              setAutoCashOut={setAutoCashOut}
              phase={phase}
              hasBet={hasBet}
              disabled={!publicKey}
            />

            {/* Place bet button */}
            {canBet && (
              <button
                onClick={placeBet}
                disabled={isPlacing || !publicKey}
                className="w-full btn-primary py-3 text-base disabled:opacity-50"
              >
                {!publicKey ? "Connect wallet to bet" :
                 isPlacing  ? "Placing bet..." :
                              `Bet ${parseFloat(amount) || 0} SOL`}
              </button>
            )}

            {/* Cash-out button (replaces place bet while round is live) */}
            <CashOutButton
              onCashOut={cashOut}
              canCashOut={canCashOut}
              isCashingOut={isCashingOut}
              multiplier={multiplier}
              betAmount={amount}
            />
          </div>

          {/* Active players */}
          <div className="card">
            <div className="text-xs text-muted uppercase tracking-widest font-semibold mb-3">
              Players ({players.length})
            </div>
            <PlayerList players={players} />
          </div>
        </div>
      </div>
    </div>
  );
}
