// ─── Server ───────────────────────────────────────────────────────────────────
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export const API_BASE =
  process.env.NEXT_PUBLIC_SOCKET_URL
    ? process.env.NEXT_PUBLIC_SOCKET_URL + "/api"
    : "http://localhost:4000/api";

// ─── Solana ───────────────────────────────────────────────────────────────────
export const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta") ??
  "devnet";

export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
  "CRaSHRouLetteProgram111111111111111111111111";

// ─── Game ─────────────────────────────────────────────────────────────────────
export const MIN_BET = 0.01;     // SOL
export const MAX_BET = 10.0;     // SOL
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Multiplier pills color thresholds
export const CRASH_DANGER  = 1.5;  // red pill if crash ≤ this
export const CRASH_MEDIUM  = 3.0;  // yellow pill if crash ≤ this
// above CRASH_MEDIUM → green pill
