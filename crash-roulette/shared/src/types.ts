// ─── Game Phase ───
export type GamePhase = "waiting" | "countdown" | "running" | "crashed";

// ─── Game State (broadcast to all clients) ───
export interface GameState {
  phase: GamePhase;
  roundId: string;
  multiplier: number;
  crashPoint: number | null; // Only revealed after crash
  startTime: number | null; // Unix ms timestamp
  countdownEnd: number | null; // Unix ms timestamp
  players: PlayerBet[];
  history: CrashHistoryEntry[];
}

// ─── Player Bet ───
export interface PlayerBet {
  walletAddress: string;
  displayName: string; // Truncated wallet: "AbCd...XyZw"
  betAmount: number; // In SOL (not lamports)
  autoCashOut: number | null; // Target multiplier for auto cash-out, null = manual
  cashedOutAt: number | null; // Multiplier when they cashed out
  profit: number | null; // Net SOL profit/loss (null while active)
  status: "active" | "cashed_out" | "busted";
}

// ─── Round History Entry ───
export interface CrashHistoryEntry {
  roundId: string;
  crashPoint: number;
  hash: string; // SHA-256 of the round seed — for provable fairness
  timestamp: number; // Unix ms
  totalBets: number; // Total SOL wagered
  totalPayout: number; // Total SOL paid out
}

// ─── WebSocket Events (Server → Client) ───
export interface ServerToClientEvents {
  "game:state": (state: GameState) => void;
  "game:tick": (data: { multiplier: number; elapsed: number }) => void;
  "game:crash": (data: { crashPoint: number; hash: string }) => void;
  "game:countdown": (data: { endsAt: number }) => void;
  "player:joined": (player: PlayerBet) => void;
  "player:cashedOut": (data: {
    walletAddress: string;
    multiplier: number;
  }) => void;
}

// ─── WebSocket Events (Client → Server) ───
export interface ClientToServerEvents {
  "bet:place": (data: {
    amount: number; // In SOL
    autoCashOut?: number; // Multiplier (e.g., 2.5)
    txSignature: string; // Solana tx to verify on-chain
  }) => void;
  "bet:cashOut": () => void;
  "auth:wallet": (walletAddress: string) => void;
}

// ─── REST API Types ───
export interface ApiRound {
  id: string;
  roundNumber: number;
  crashPoint: number;
  seedHash: string;
  totalBets: number;
  totalPayout: number;
  playerCount: number;
  startedAt: string; // ISO date string
  crashedAt: string;
}

export interface ApiBet {
  id: string;
  walletAddress: string;
  amount: number;
  autoCashOut: number | null;
  cashedOutAt: number | null;
  profit: number | null;
  status: "active" | "cashed_out" | "busted";
  txSignature: string | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  walletAddress: string;
  displayName: string;
  totalWagered: number;
  totalProfit: number;
  biggestWin: number;
  biggestMultiplier: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number; // 0–1
}

export interface HistoryResponse {
  rounds: ApiRound[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

export interface VerifyResponse {
  roundId: string;
  crashPoint: number;
  hash: string;
  seed: string; // Only revealed after round ends
  verified: boolean;
}

// ─── Solana On-Chain Types ───
export interface OnChainBet {
  player: string; // Public key as base58 string
  roundId: number; // u64
  amount: number; // In lamports
  autoCashOut: number; // Multiplier × 100 (0 = manual)
  cashedOutAt: number; // Multiplier × 100 (0 = not cashed out)
  settled: boolean;
  placedAt: number; // Unix timestamp
}

export interface OnChainGamePool {
  authority: string;
  houseEdgeBps: number;
  totalLiquidity: number; // In lamports
  totalWagered: number;
  totalPaidOut: number;
  currentRound: number;
}
