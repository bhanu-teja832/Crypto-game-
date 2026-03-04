"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import type {
  GamePhase,
  GameState,
  PlayerBet,
  CrashHistoryEntry,
} from "@/lib/types";
import type { GraphPoint } from "@/lib/types";

/**
 * Core game state hook.
 * Subscribes to all Socket.IO game events and exposes a unified state object.
 *
 * Used by the main game page; all other components read from this hook's output.
 */
export function useGame() {
  const [phase, setPhase]               = useState<GamePhase>("waiting");
  const [multiplier, setMultiplier]     = useState(1.0);
  const [crashPoint, setCrashPoint]     = useState<number | null>(null);
  const [players, setPlayers]           = useState<PlayerBet[]>([]);
  const [history, setHistory]           = useState<CrashHistoryEntry[]>([]);
  const [countdownEnd, setCountdownEnd] = useState<number | null>(null);
  const [connected, setConnected]       = useState(false);
  const [roundId, setRoundId]           = useState("0");
  const [graphPoints, setGraphPoints]   = useState<GraphPoint[]>([]);

  // Track round start time to build graph points from ticks
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const s = getSocket();

    // ── Connection ──────────────────────────────────────────────────────────
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    if (s.connected) setConnected(true);

    // ── Full state sync (on connect or after server restart) ────────────────
    s.on("game:state", (state: GameState) => {
      setPhase(state.phase);
      setMultiplier(state.multiplier);
      setCrashPoint(state.crashPoint);
      setPlayers(state.players);
      setHistory(state.history);
      setRoundId(state.roundId);
      setCountdownEnd(state.countdownEnd);

      if (state.phase === "running" && state.startTime) {
        startTimeRef.current = state.startTime;
        // Rebuild graph from current multiplier as single seed point
        setGraphPoints([{ time: Date.now() - state.startTime, value: state.multiplier }]);
      } else if (state.phase !== "running") {
        setGraphPoints([]);
      }
    });

    // ── Tick (multiplier update, 20×/sec) ───────────────────────────────────
    s.on("game:tick", ({ multiplier: m, elapsed }) => {
      setMultiplier(m);
      setPhase("running");
      setGraphPoints((prev) => [...prev, { time: elapsed, value: m }]);
    });

    // ── Crash ────────────────────────────────────────────────────────────────
    s.on("game:crash", ({ crashPoint: cp, hash }) => {
      setCrashPoint(cp);
      setMultiplier(cp);
      setPhase("crashed");

      // Mark all still-active players as busted
      setPlayers((prev) =>
        prev.map((p) =>
          p.status === "active"
            ? { ...p, status: "busted" as const, profit: -p.betAmount }
            : p
        )
      );

      // Prepend to history
      setHistory((prev) => [
        {
          roundId,
          crashPoint: cp,
          hash,
          timestamp: Date.now(),
          totalBets: 0,
          totalPayout: 0,
        },
        ...prev.slice(0, 29),
      ]);
    });

    // ── Countdown ────────────────────────────────────────────────────────────
    s.on("game:countdown", ({ endsAt }) => {
      setPhase("countdown");
      setCountdownEnd(endsAt);
      setMultiplier(1.0);
      setCrashPoint(null);
      setPlayers([]);
      setGraphPoints([]);
    });

    // ── Players ──────────────────────────────────────────────────────────────
    s.on("player:joined", (player: PlayerBet) => {
      setPlayers((prev) => {
        const exists = prev.some((p) => p.walletAddress === player.walletAddress);
        return exists ? prev : [...prev, player];
      });
    });

    s.on("player:cashedOut", ({ walletAddress, multiplier: m }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.walletAddress === walletAddress
            ? {
                ...p,
                cashedOutAt: m,
                status: "cashed_out" as const,
                profit: parseFloat((p.betAmount * m - p.betAmount).toFixed(6)),
              }
            : p
        )
      );
    });

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("game:state");
      s.off("game:tick");
      s.off("game:crash");
      s.off("game:countdown");
      s.off("player:joined");
      s.off("player:cashedOut");
    };
  }, [roundId]);

  return {
    phase,
    multiplier,
    crashPoint,
    players,
    history,
    countdownEnd,
    connected,
    graphPoints,
    roundId,
  };
}
