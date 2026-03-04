// Re-export shared types for convenience
export type {
  GamePhase,
  GameState,
  PlayerBet,
  CrashHistoryEntry,
  LeaderboardEntry,
  ApiRound,
  ApiBet,
  HistoryResponse,
  LeaderboardResponse,
  VerifyResponse,
} from "../../shared/src/types";

// ─── Frontend-only types ──────────────────────────────────────────────────────

/** Graph point used for the animated crash line */
export interface GraphPoint {
  time: number;   // ms since round start
  value: number;  // multiplier at that time
}

/** Toast notification */
export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  durationMs?: number;
}

/** Bet form state managed by useBet */
export interface BetFormState {
  amount: string;          // raw string from input
  autoCashOut: string;     // raw string (empty = manual)
  isValid: boolean;
  error: string | null;
}

/** Result of a bet placement attempt */
export interface BetResult {
  success: boolean;
  error?: string;
  txSignature?: string;
}

/** What useGame exposes to components */
export interface GameContext {
  phase: import("../../shared/src/types").GamePhase;
  multiplier: number;
  crashPoint: number | null;
  players: import("../../shared/src/types").PlayerBet[];
  history: import("../../shared/src/types").CrashHistoryEntry[];
  countdownEnd: number | null;
  connected: boolean;
  graphPoints: GraphPoint[];
  roundId: string;
}
