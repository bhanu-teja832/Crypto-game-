import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../utils/config";
import { loadHouseKeypair } from "./keypair";
import { logger } from "../utils/logger";

// ─── IDL type (subset needed for our server calls) ────────────────────────────
// Replace this with the generated IDL JSON after running `anchor build`.
// The IDL JSON will be at: anchor/target/idl/crash_roulette.json
// Import it like: import IDL from "../../anchor/target/idl/crash_roulette.json"
//
// For now, we type the program using Anchor's Program<Idl> generic.

let _connection: Connection | null = null;
let _provider: anchor.AnchorProvider | null = null;
let _program: anchor.Program | null = null;

/** Derive the game pool PDA */
export function gamePoolPDA(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game_pool")],
    programId
  );
  return pda;
}

/** Derive a game round PDA */
export function gameRoundPDA(programId: PublicKey, roundId: number): PublicKey {
  const roundIdBuf = Buffer.alloc(8);
  roundIdBuf.writeBigUInt64LE(BigInt(roundId));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game_round"), roundIdBuf],
    programId
  );
  return pda;
}

/** Derive a player bet PDA */
export function playerBetPDA(
  programId: PublicKey,
  playerPubkey: PublicKey,
  roundId: number
): PublicKey {
  const roundIdBuf = Buffer.alloc(8);
  roundIdBuf.writeBigUInt64LE(BigInt(roundId));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("player_bet"), playerPubkey.toBuffer(), roundIdBuf],
    programId
  );
  return pda;
}

/** Get or lazily initialize the Solana connection */
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(config.solanaRpcUrl, "confirmed");
    logger.info("Solana", `Connected to ${config.solanaRpcUrl}`);
  }
  return _connection;
}

/**
 * Get or lazily initialize the Anchor provider and program.
 * Requires the house keypair to be loaded.
 *
 * NOTE: After running `anchor build`, replace the IDL import at the top of
 * this file with the generated IDL JSON and update getProgram() accordingly.
 */
export function getProvider(): anchor.AnchorProvider {
  if (_provider) return _provider;

  const connection = getConnection();
  const keypair = loadHouseKeypair();
  const wallet = new anchor.Wallet(keypair);
  _provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return _provider;
}

/**
 * Build a partially-signed cash_out transaction for the given player.
 * The transaction is signed by the house authority; the player must co-sign
 * before broadcasting.
 *
 * Returns the base64-encoded partially-signed transaction.
 */
export async function buildPartialCashOutTx(
  playerPubkey: PublicKey,
  roundId: number,
  multiplierBps: number
): Promise<string> {
  const programId = new PublicKey(config.programId);
  const houseKeypair = loadHouseKeypair();
  const connection = getConnection();

  const poolPda = gamePoolPDA(programId);
  const roundPda = gameRoundPDA(programId, roundId);
  const betPda = playerBetPDA(programId, playerPubkey, roundId);

  // Construct the instruction discriminator manually (Anchor 8-byte discriminator)
  // This is sha256("global:cash_out")[0..8]
  // After anchor build, use program.methods.cashOut() instead.
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  // ── Use the Anchor Program (if IDL is available) ──
  // If you have the IDL, use:
  //   const tx = await program.methods
  //     .cashOut(new anchor.BN(multiplierBps))
  //     .accounts({ player: playerPubkey, authority: houseKeypair.publicKey, ... })
  //     .transaction();
  //
  // For now, we build a raw transaction using system_program + placeholders.
  // Replace this section with the above after anchor build.

  const { Transaction, SystemProgram } = await import("@solana/web3.js");
  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.feePayer = playerPubkey; // Player pays fees

  // Add a memo instruction as placeholder until IDL is available
  // REPLACE with actual cash_out instruction after anchor build
  logger.warn(
    "SolanaClient",
    "buildPartialCashOutTx: using placeholder tx — replace with IDL-based implementation"
  );

  // Partially sign with house authority
  tx.partialSign(houseKeypair);

  // Serialize without requiring all signatures (player hasn't signed yet)
  return Buffer.from(tx.serialize({ requireAllSignatures: false })).toString("base64");
}
