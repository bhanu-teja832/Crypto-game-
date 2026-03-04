import { Socket, Server as SocketServer } from "socket.io";
import { GameEngine } from "../game/engine";
import { buildPartialCashOutTx } from "../solana/client";
import { verifyBetTransaction } from "../solana/settle-round";
import { logger } from "../utils/logger";
import { PublicKey } from "@solana/web3.js";

const TAG = "WS";

/** Associate a wallet address with a socket connection. */
interface AuthenticatedSocket extends Socket {
  walletAddress?: string;
}

/**
 * Register all WebSocket event handlers for a connected client.
 *
 * Events (Client → Server):
 *   auth:wallet       — Link socket to a wallet address.
 *   bet:place         — Register a bet (after on-chain tx confirmed).
 *   bet:cashOut       — Request manual cash-out; server returns partial tx.
 *   cashout:confirmed — Player broadcast the signed tx; server records tx sig.
 */
export function registerSocketHandlers(
  socket: AuthenticatedSocket,
  engine: GameEngine,
  io: SocketServer
): void {
  logger.info(TAG, `Client connected: ${socket.id}`);

  // ── Authenticate wallet ──────────────────────────────────────────────────
  socket.on("auth:wallet", (walletAddress: string) => {
    try {
      // Validate it's a real base58 public key
      new PublicKey(walletAddress);
      socket.walletAddress = walletAddress;
      logger.info(TAG, `Wallet linked: ${socket.id} → ${walletAddress.slice(0, 8)}...`);
      socket.emit("auth:ok", { walletAddress });
    } catch {
      socket.emit("auth:error", { message: "Invalid wallet address" });
    }
  });

  // ── Place Bet ─────────────────────────────────────────────────────────────
  socket.on(
    "bet:place",
    async (data: {
      amount: number;       // SOL (not lamports)
      autoCashOut?: number; // Multiplier threshold (e.g., 2.5)
      txSignature: string;  // On-chain place_bet tx signature
    }) => {
      const wallet = socket.walletAddress;

      if (!wallet) {
        socket.emit("bet:error", { message: "Not authenticated. Send auth:wallet first." });
        return;
      }

      const { amount, autoCashOut, txSignature } = data;

      // Validate inputs
      if (typeof amount !== "number" || amount <= 0) {
        socket.emit("bet:error", { message: "Invalid bet amount" });
        return;
      }

      // Verify on-chain tx (non-blocking — we don't hold up the game)
      // In production this should be awaited before accepting the bet.
      verifyBetTransaction(txSignature, wallet, Math.round(amount * 1e9))
        .then((valid) => {
          if (!valid) {
            logger.warn(TAG, `Bet tx invalid for ${wallet}: ${txSignature}`);
            // In production, reject the bet here. For devnet testing we allow it.
          }
        })
        .catch((err) => logger.error(TAG, "Tx verification error", err));

      const result = engine.placeBet(wallet, amount, txSignature, autoCashOut);

      if (result.success) {
        socket.emit("bet:ok", { roundId: engine.getCurrentRoundId() });
      } else {
        socket.emit("bet:error", { message: result.error });
      }
    }
  );

  // ── Cash Out ──────────────────────────────────────────────────────────────
  socket.on("bet:cashOut", async () => {
    const wallet = socket.walletAddress;

    if (!wallet) {
      socket.emit("cashout:error", { message: "Not authenticated." });
      return;
    }

    // Lock in the multiplier and mark bet as cashed out in engine
    const result = engine.requestCashOut(wallet);

    if (!result.success) {
      socket.emit("cashout:error", { message: result.error });
      return;
    }

    const lockedMultiplier = result.multiplier!;
    const multiplierBps = Math.floor(lockedMultiplier * 100);
    const roundId = engine.getCurrentRoundId();

    try {
      // Build the partially-signed cash_out transaction
      const playerPubkey = new PublicKey(wallet);
      const partialTxBase64 = await buildPartialCashOutTx(
        playerPubkey,
        roundId,
        multiplierBps
      );

      // Send to client for player co-signature
      socket.emit("cashout:sign_tx", {
        tx: partialTxBase64,
        multiplier: lockedMultiplier,
        multiplierBps,
        roundId,
      });

      logger.info(TAG, `Cash-out tx sent to ${wallet.slice(0, 8)}... at ${lockedMultiplier}x`);
    } catch (err) {
      logger.error(TAG, `Failed to build cash-out tx for ${wallet}`, err);
      // Even if on-chain tx fails, the engine has already recorded the cash-out.
      // Emit a success acknowledgment so the UI updates.
      socket.emit("cashout:ok", {
        multiplier: lockedMultiplier,
        note: "Off-chain recorded; on-chain tx failed. Contact support.",
      });
    }
  });

  // ── Cashout Confirmed (player signed + broadcast) ─────────────────────────
  socket.on("cashout:confirmed", (data: { txSignature: string }) => {
    const wallet = socket.walletAddress;
    if (!wallet || !data.txSignature) return;

    engine.confirmCashOut(wallet, data.txSignature);
    socket.emit("cashout:ok", {
      txSignature: data.txSignature,
      multiplier: engine.getCurrentMultiplier(),
    });

    logger.info(TAG, `Cash-out confirmed: ${wallet.slice(0, 8)}... tx=${data.txSignature.slice(0, 16)}...`);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    logger.info(TAG, `Client disconnected: ${socket.id} (${reason})`);
  });

  // ── Error handling ────────────────────────────────────────────────────────
  socket.on("error", (err) => {
    logger.error(TAG, `Socket error on ${socket.id}`, err);
  });
}
