import { Server as SocketServer } from "socket.io";
import {
  TICK_INTERVAL_MS,
  BASE_GROWTH_RATE,
  ROUND_COUNTDOWN_MS,
  CRASH_DISPLAY_MS,
  MAX_MULTIPLIER,
} from "../../shared/src/constants";
import { GamePhase, GameState, PlayerBet, CrashHistoryEntry } from "../../shared/src/types";
import {
  generateRoundSeed,
  computeCrashPoint,
  computeRoundHash,
  crashPointToBps,
} from "./crash-point";
import { RoundManager } from "./round-manager";
import { logger } from "../utils/logger";

const TAG = "GameEngine";

export interface ActiveBet extends PlayerBet {
  betAmountLamports: number;
  txSignature: string | null;
}

export class GameEngine {
  private io: SocketServer;
  private roundManager: RoundManager;

  // ─── Round state ───
  private phase: GamePhase = "waiting";
  private multiplier = 1.0;
  private crashPoint = 0;
  private roundSeed = "";
  private roundHash = "";
  private roundId = 0;
  private startTime = 0;
  private countdownEnd = 0;
  private tickInterval: NodeJS.Timeout | null = null;
  private historyPoints: { time: number; value: number }[] = [];

  // ─── Players ───
  private players: Map<string, ActiveBet> = new Map();

  // ─── History (in-memory, last 30 rounds) ───
  private history: CrashHistoryEntry[] = [];

  constructor(io: SocketServer, roundManager: RoundManager) {
    this.io = io;
    this.roundManager = roundManager;
  }

  /** Start the engine — kicks off the first round after a brief delay. */
  start() {
    logger.info(TAG, "Engine starting...");
    setTimeout(() => this.startNewRound(), 2000);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Round Lifecycle
  // ──────────────────────────────────────────────────────────────────────────

  private startNewRound() {
    // Generate provably fair crash point BEFORE accepting bets
    this.roundSeed = generateRoundSeed();
    this.crashPoint = computeCrashPoint(this.roundSeed);
    this.roundHash = computeRoundHash(this.roundSeed);
    this.roundId++;
    this.phase = "waiting";
    this.multiplier = 1.0;
    this.players.clear();
    this.historyPoints = [];

    logger.info(TAG, `Round ${this.roundId} prepared. Crash at ${this.crashPoint}x [hidden]`);

    // Notify on-chain (fire-and-forget)
    this.roundManager.onRoundStart(this.roundId, this.roundHash).catch((err) => {
      logger.error(TAG, "Failed to start round on-chain", err);
    });

    this.io.emit("game:state", this.getState());

    // Begin countdown
    this.countdownEnd = Date.now() + ROUND_COUNTDOWN_MS;
    this.phase = "countdown";
    this.io.emit("game:countdown", { endsAt: this.countdownEnd });

    setTimeout(() => this.launchRound(), ROUND_COUNTDOWN_MS);
  }

  private launchRound() {
    this.phase = "running";
    this.startTime = Date.now();
    this.multiplier = 1.0;

    logger.info(TAG, `Round ${this.roundId} running. ${this.players.size} player(s).`);
    this.io.emit("game:state", this.getState());

    this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  private tick() {
    const elapsed = Date.now() - this.startTime;
    const ticks = elapsed / TICK_INTERVAL_MS;

    // Exponential growth: e^(BASE_GROWTH_RATE × ticks)
    this.multiplier = Math.min(
      Math.pow(Math.E, BASE_GROWTH_RATE * ticks),
      MAX_MULTIPLIER
    );
    this.multiplier = Math.floor(this.multiplier * 100) / 100;

    // Record for graph
    this.historyPoints.push({ time: elapsed, value: this.multiplier });

    // Check auto cash-outs
    for (const [wallet, bet] of this.players) {
      if (
        bet.status === "active" &&
        bet.autoCashOut !== null &&
        bet.autoCashOut > 0 &&
        this.multiplier >= bet.autoCashOut
      ) {
        this.processCashOut(wallet, bet.autoCashOut);
      }
    }

    // Check crash
    if (this.multiplier >= this.crashPoint) {
      this.crash();
      return;
    }

    this.io.emit("game:tick", { multiplier: this.multiplier, elapsed });
  }

  private crash() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.phase = "crashed";
    this.multiplier = this.crashPoint;

    // Mark all remaining active bets as busted
    const busted: string[] = [];
    for (const [wallet, bet] of this.players) {
      if (bet.status === "active") {
        bet.status = "busted";
        bet.profit = -bet.betAmount;
        busted.push(wallet);
      }
    }

    logger.info(
      TAG,
      `Round ${this.roundId} CRASHED at ${this.crashPoint}x. ${busted.length} busted.`
    );

    // Broadcast crash event (reveals crash point + hash for verification)
    this.io.emit("game:crash", {
      crashPoint: this.crashPoint,
      hash: this.roundHash,
    });

    // Add to in-memory history
    const entry: CrashHistoryEntry = {
      roundId: String(this.roundId),
      crashPoint: this.crashPoint,
      hash: this.roundHash,
      timestamp: Date.now(),
      totalBets: Array.from(this.players.values()).reduce(
        (sum, b) => sum + b.betAmount,
        0
      ),
      totalPayout: Array.from(this.players.values())
        .filter((b) => b.status === "cashed_out")
        .reduce((sum, b) => sum + (b.profit ?? 0) + b.betAmount, 0),
    };
    this.history = [entry, ...this.history.slice(0, 29)];

    // Settle on-chain and in DB (fire-and-forget)
    this.roundManager
      .onRoundEnd(
        this.roundId,
        this.crashPoint,
        this.roundSeed,
        this.roundHash,
        Array.from(this.players.values())
      )
      .catch((err) => logger.error(TAG, "Failed to settle round", err));

    // Start next round after display pause
    setTimeout(() => this.startNewRound(), CRASH_DISPLAY_MS);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Cash-Out Processing
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Process a manual or auto cash-out.
   * Returns a base64 partially-signed transaction for the player to co-sign.
   */
  private processCashOut(walletAddress: string, atMultiplier: number): void {
    const bet = this.players.get(walletAddress);
    if (!bet || bet.status !== "active") return;

    bet.cashedOutAt = atMultiplier;
    bet.status = "cashed_out";
    bet.profit = parseFloat((bet.betAmount * atMultiplier - bet.betAmount).toFixed(6));

    this.io.emit("player:cashedOut", {
      walletAddress,
      multiplier: atMultiplier,
    });

    logger.info(
      TAG,
      `Cash-out: ${bet.displayName} at ${atMultiplier}x (+${bet.profit.toFixed(4)} SOL)`
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API (called from WebSocket handlers)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Register a bet from a player.
   * Called after the server has verified the on-chain place_bet tx.
   */
  placeBet(
    walletAddress: string,
    amountSol: number,
    txSignature: string | null,
    autoCashOut?: number
  ): { success: boolean; error?: string } {
    if (this.phase !== "waiting" && this.phase !== "countdown") {
      return { success: false, error: "Betting is closed for this round" };
    }

    if (this.players.has(walletAddress)) {
      return { success: false, error: "Already bet this round" };
    }

    const bet: ActiveBet = {
      walletAddress,
      displayName: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
      betAmount: amountSol,
      betAmountLamports: Math.round(amountSol * 1e9),
      autoCashOut: autoCashOut ?? null,
      cashedOutAt: null,
      profit: null,
      status: "active",
      txSignature,
    };

    this.players.set(walletAddress, bet);
    this.io.emit("player:joined", bet);

    logger.info(TAG, `Bet: ${bet.displayName} → ${amountSol} SOL (round ${this.roundId})`);
    return { success: true };
  }

  /**
   * Initiate a manual cash-out for a player.
   * Returns the partial tx (base64) for the player to sign, or null if instant.
   *
   * Flow:
   *   1. Server records current multiplier (this function).
   *   2. Server builds partial cash_out tx (signed by authority).
   *   3. Frontend receives `cashout:sign_tx` event, player signs + broadcasts.
   *   4. Frontend sends `cashout:confirmed` with the tx signature.
   */
  requestCashOut(walletAddress: string): {
    success: boolean;
    multiplier?: number;
    error?: string;
  } {
    if (this.phase !== "running") {
      return { success: false, error: "Round is not running" };
    }

    const bet = this.players.get(walletAddress);
    if (!bet || bet.status !== "active") {
      return { success: false, error: "No active bet found" };
    }

    const lockedMultiplier = this.multiplier;
    this.processCashOut(walletAddress, lockedMultiplier);

    return { success: true, multiplier: lockedMultiplier };
  }

  /** Confirm a cash-out with an on-chain tx signature (called after player broadcasts). */
  confirmCashOut(walletAddress: string, txSignature: string): void {
    const bet = this.players.get(walletAddress);
    if (bet) {
      (bet as any).cashOutTx = txSignature;
      logger.info(TAG, `Cash-out confirmed on-chain: ${txSignature}`);
    }
  }

  getState(): GameState {
    return {
      phase: this.phase,
      roundId: String(this.roundId),
      multiplier: this.multiplier,
      crashPoint: this.phase === "crashed" ? this.crashPoint : null,
      startTime: this.startTime || null,
      countdownEnd: this.countdownEnd || null,
      players: Array.from(this.players.values()),
      history: this.history,
    };
  }

  getHistoryPoints() {
    return this.historyPoints;
  }

  getCurrentRoundId() {
    return this.roundId;
  }

  getCurrentMultiplier() {
    return this.multiplier;
  }

  getPhase() {
    return this.phase;
  }
}
