import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { config } from "../utils/config";
import { getProvider, gamePoolPDA, gameRoundPDA } from "./client";
import { loadHouseKeypair } from "./keypair";
import { logger } from "../utils/logger";

// ─── IMPORTANT ────────────────────────────────────────────────────────────────
// After running `anchor build`, import the generated IDL and use it here:
//
//   import IDL from "../../../anchor/target/idl/crash_roulette.json";
//
// Then replace the manual instruction builders with:
//
//   const provider = getProvider();
//   const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
//   await program.methods.startRound().accounts({...}).rpc();
//
// Until then, these functions log the intent and simulate success.
// ──────────────────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey(config.programId);

/**
 * Call the start_round instruction on-chain.
 * Creates a GameRound PDA for the given round number.
 */
export async function startRoundOnChain(roundId: number): Promise<string | null> {
  try {
    const provider = getProvider();
    const houseKeypair = loadHouseKeypair();
    const poolPda = gamePoolPDA(PROGRAM_ID);
    const roundPda = gameRoundPDA(PROGRAM_ID, roundId);

    // ── After anchor build: uncomment and replace ──
    // const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
    // const txSig = await program.methods
    //   .startRound()
    //   .accounts({
    //     authority: houseKeypair.publicKey,
    //     gamePool: poolPda,
    //     gameRound: roundPda,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .rpc();
    // logger.info("Solana", `start_round tx: ${txSig}`);
    // return txSig;

    // ── Placeholder (remove after anchor build) ──
    logger.info(
      "Solana",
      `[STUB] start_round for round ${roundId}. Pool PDA: ${poolPda.toBase58()}, Round PDA: ${roundPda.toBase58()}`
    );
    logger.warn(
      "Solana",
      "On-chain start_round is stubbed. Run `anchor build` and update settle-round.ts to enable."
    );
    return null;
  } catch (err) {
    logger.error("Solana", `start_round failed for round ${roundId}`, err);
    return null;
  }
}

/**
 * Call the settle_round instruction on-chain.
 *
 * Records the crash point and seed hash on-chain.
 * All bets not cashed out before this call are busted (SOL stays in pool).
 *
 * @param roundId       — The round number being settled.
 * @param crashPointBps — Crash point × 100 (e.g., 143 = 1.43x).
 * @param roundHash     — 32-byte SHA-256 hash of the round seed (hex string → bytes).
 */
export async function settleRoundOnChain(
  roundId: number,
  crashPointBps: number,
  roundHashHex: string
): Promise<string | null> {
  try {
    const provider = getProvider();
    const houseKeypair = loadHouseKeypair();
    const poolPda = gamePoolPDA(PROGRAM_ID);
    const roundPda = gameRoundPDA(PROGRAM_ID, roundId);

    // Convert 64-char hex string → 32-byte Uint8Array
    const roundHashBytes = Buffer.from(roundHashHex, "hex");
    if (roundHashBytes.length !== 32) {
      throw new Error(`Invalid round hash length: ${roundHashBytes.length} (expected 32)`);
    }
    const roundHashArray = Array.from(roundHashBytes);

    // ── After anchor build: uncomment and replace ──
    // const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
    // const txSig = await program.methods
    //   .settleRound(new anchor.BN(crashPointBps), roundHashArray)
    //   .accounts({
    //     authority: houseKeypair.publicKey,
    //     gamePool: poolPda,
    //     gameRound: roundPda,
    //   })
    //   .rpc();
    // logger.info("Solana", `settle_round tx: ${txSig} | round=${roundId} crash=${crashPointBps}bps`);
    // return txSig;

    // ── Placeholder (remove after anchor build) ──
    logger.info(
      "Solana",
      `[STUB] settle_round: round=${roundId}, crashPoint=${crashPointBps / 100}x, hash=${roundHashHex.slice(0, 16)}...`
    );
    logger.warn(
      "Solana",
      "On-chain settle_round is stubbed. Run `anchor build` and update settle-round.ts to enable."
    );
    return null;
  } catch (err) {
    logger.error("Solana", `settle_round failed for round ${roundId}`, err);
    return null;
  }
}

/**
 * Verify that a bet transaction exists on-chain and is valid.
 * Called when a player emits `bet:place` with their tx signature.
 *
 * @returns true if the tx is confirmed and valid, false otherwise.
 */
export async function verifyBetTransaction(
  txSignature: string,
  expectedPlayer: string,
  expectedAmount: number // lamports
): Promise<boolean> {
  try {
    const { connection: conn } = getProvider();
    const tx = await (conn as any).getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      logger.warn("Solana", `Bet tx not found: ${txSignature}`);
      return false;
    }

    if (tx.meta?.err) {
      logger.warn("Solana", `Bet tx failed on-chain: ${txSignature}`);
      return false;
    }

    logger.info("Solana", `Bet tx verified: ${txSignature}`);
    return true;
  } catch (err) {
    logger.error("Solana", `verifyBetTransaction failed: ${txSignature}`, err);
    return false;
  }
}
