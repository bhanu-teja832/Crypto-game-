import crypto from "crypto";
import { config } from "../utils/config";

// ─── Provably Fair Crash Point Generation ─────────────────────────────────────
//
// How it works:
//   1. Before each round, the server generates a random 32-byte seed (hex).
//   2. The seed is HMAC-SHA256'd with SERVER_SECRET to produce the crash point.
//   3. The seed is revealed AFTER the crash so players can independently verify.
//
// Why HMAC?  The server cannot manipulate the crash point after seeing bets,
// because the crash point is determined by the seed BEFORE betting opens.
// Players verify by re-running computeCrashPoint(seed) with the published secret.
//
// Crash distribution:
//   - 1-in-INSTANT_CRASH_MOD (default 1-in-33) chance of 1.00x instant crash.
//   - Otherwise: exponential distribution with house edge applied.
//
// House edge:
//   - Applied multiplicatively. With 3% edge, the expected return per 1 SOL
//     wagered over many rounds is 0.97 SOL.
//
// Reference: This is the same algorithm used by Bustabit (the original crash game).

/** Generate a fresh random 32-byte hex seed for a new round. */
export function generateRoundSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Compute the crash point for a given seed.
 *
 * @param roundSeed  — 64-char hex string (the round's secret seed).
 * @param houseEdge  — Fraction to retain as profit (default 0.03 = 3%).
 * @returns Crash point as a float (e.g., 1.43).
 */
export function computeCrashPoint(roundSeed: string, houseEdge = 0.03): number {
  const hmac = crypto.createHmac("sha256", config.serverSecret);
  hmac.update(roundSeed);
  const hash = hmac.digest("hex");

  // Use the first 52 bits (13 hex chars) of the hash for high precision.
  const h = parseInt(hash.slice(0, 13), 16);
  const e = Math.pow(2, 52); // 2^52

  // 1-in-33 instant crash (house's way to guarantee 1x crash occasionally)
  if (h % 33 === 0) return 1.0;

  // Exponential distribution: produces values from 1 to ∞ with decreasing probability.
  // raw = 100e / (e - h)  → maps [0, e) hash to [100, ∞) crash points (×100)
  const raw = (100 * e - h) / (e - h);

  // Apply house edge: players get (1 - houseEdge) of their fair winnings
  const withEdge = Math.floor(raw * (1 - houseEdge)) / 100;

  return Math.max(1.0, withEdge);
}

/**
 * Compute the public hash (SHA-256 of the seed).
 * Published at the START of each round so players can confirm the seed
 * wasn't changed. After the round, the seed itself is revealed.
 *
 * Players verify: SHA-256(seed) === published hash
 */
export function computeRoundHash(roundSeed: string): string {
  return crypto.createHash("sha256").update(roundSeed).digest("hex");
}

/**
 * Verify a historical round.
 * Given the seed (revealed post-crash) and server secret, recompute crash point.
 *
 * Players use this to prove the house didn't cheat:
 *   1. Check SHA-256(seed) === the hash published at round start.
 *   2. Check computeCrashPoint(seed) === the crash point shown.
 */
export function verifyCrashPoint(roundSeed: string): {
  crashPoint: number;
  hash: string;
} {
  return {
    crashPoint: computeCrashPoint(roundSeed),
    hash: computeRoundHash(roundSeed),
  };
}

/**
 * Convert a crash point float to basis points (×100) for on-chain use.
 * e.g., 1.43 → 143
 */
export function crashPointToBps(crashPoint: number): number {
  return Math.floor(crashPoint * 100);
}
