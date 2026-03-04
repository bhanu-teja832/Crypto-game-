// ─── House Parameters ───
export const HOUSE_EDGE = 0.03; // 3% house edge applied to crash point calculation

// ─── Bet Limits ───
export const MIN_BET = 0.01; // Minimum bet in SOL
export const MAX_BET = 10.0; // Maximum bet in SOL
export const MIN_BET_LAMPORTS = 10_000_000; // 0.01 SOL in lamports
export const MAX_BET_LAMPORTS = 10_000_000_000; // 10 SOL in lamports
export const LAMPORTS_PER_SOL = 1_000_000_000;

// ─── Game Timing ───
export const TICK_INTERVAL_MS = 50; // Multiplier update interval (20 ticks/sec)
export const BASE_GROWTH_RATE = 0.0025; // Exponential growth coefficient per tick
export const ROUND_COUNTDOWN_MS = 5000; // 5 seconds between rounds
export const CRASH_DISPLAY_MS = 3000; // Time to show crash result before next round

// ─── Round Rules ───
export const MIN_PLAYERS_TO_START = 1; // Minimum players required to start a round
export const MAX_MULTIPLIER = 1000; // Safety cap on multiplier
export const INSTANT_CRASH_MOD = 33; // 1-in-33 chance of 1.00x crash

// ─── History ───
export const MAX_HISTORY_ENTRIES = 30; // Number of past rounds to keep in memory

// ─── Solana ───
export const SOLANA_NETWORK = "devnet" as const;
export const SOLANA_RPC_DEVNET = "https://api.devnet.solana.com";

// ─── WebSocket ───
export const WS_EVENTS = {
  // Server → Client
  GAME_STATE: "game:state",
  GAME_TICK: "game:tick",
  GAME_CRASH: "game:crash",
  GAME_COUNTDOWN: "game:countdown",
  PLAYER_JOINED: "player:joined",
  PLAYER_CASHED_OUT: "player:cashedOut",
  // Client → Server
  BET_PLACE: "bet:place",
  BET_CASHOUT: "bet:cashOut",
  AUTH_WALLET: "auth:wallet",
} as const;
