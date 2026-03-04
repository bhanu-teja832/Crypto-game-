"use client";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { SOLANA_RPC, PROGRAM_ID, LAMPORTS_PER_SOL as LAMPORTS } from "./constants";

// ─── Connection ───────────────────────────────────────────────────────────────

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC, "confirmed");
  }
  return _connection;
}

// ─── PDA Derivation ───────────────────────────────────────────────────────────

const programId = new PublicKey(PROGRAM_ID);

export function deriveGamePoolPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game_pool")],
    programId
  );
  return pda;
}

export function derivePlayerBetPDA(
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

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * Build, sign, and send a place_bet transaction.
 *
 * NOTE: This sends a simple SOL transfer to the game pool PDA as a placeholder.
 * Replace with the actual Anchor program instruction after `anchor build`:
 *
 *   const program = new anchor.Program(IDL, programId, provider);
 *   const txSig = await program.methods
 *     .placeBet(new BN(amountLamports), new BN(autoCashOutBps))
 *     .accounts({ player: wallet.publicKey, gamePool: poolPDA, ... })
 *     .rpc();
 */
export async function sendPlaceBetTx(
  wallet: WalletContextState,
  amountSol: number,
  autoCashOutMultiplier?: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  const connection = getConnection();
  const amountLamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  const poolPDA = deriveGamePoolPDA();

  // Build the transaction
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: wallet.publicKey,
  });

  // ── Placeholder: plain SOL transfer to pool PDA ──
  // Replace with Anchor CPI instruction after anchor build:
  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: poolPDA,
      lamports: amountLamports,
    })
  );

  // Sign and send
  const signed = await wallet.signTransaction(tx);
  const raw = signed.serialize();
  const txSig = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(txSig, "confirmed");
  return txSig;
}

/**
 * Sign and broadcast a partially-signed cash-out transaction received from the server.
 * The server has already signed with the authority keypair; we add the player signature.
 */
export async function signAndSendCashOutTx(
  wallet: WalletContextState,
  partialTxBase64: string
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  const connection = getConnection();
  const txBytes = Buffer.from(partialTxBase64, "base64");
  const tx = Transaction.from(txBytes);

  // Add player signature
  const signed = await wallet.signTransaction(tx);
  const raw = signed.serialize();

  const txSig = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(txSig, "confirmed");
  return txSig;
}

/** Get SOL balance for a public key (returns SOL as float). */
export async function getSolBalance(pubkey: PublicKey): Promise<number> {
  const connection = getConnection();
  const lamports = await connection.getBalance(pubkey, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
}

/** Format a SOL amount to a readable string. */
export function formatSol(sol: number, decimals = 4): string {
  return sol.toFixed(decimals);
}

/** Format a wallet address to short form. */
export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
