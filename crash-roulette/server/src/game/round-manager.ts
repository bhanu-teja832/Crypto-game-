import { PrismaClient } from "@prisma/client";
import { startRoundOnChain, settleRoundOnChain } from "../solana/settle-round";
import { crashPointToBps } from "./crash-point";
import { logger } from "../utils/logger";
import type { ActiveBet } from "./engine";

const TAG = "RoundManager";

/**
 * RoundManager coordinates round lifecycle between the game engine, the
 * Solana program, and the PostgreSQL database.
 *
 * - onRoundStart: called when a new round begins (starts on-chain round).
 * - onRoundEnd: called when a round crashes (settles on-chain, persists to DB).
 */
export class RoundManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Called by the engine when a new round starts.
   * Kicks off the on-chain start_round instruction.
   */
  async onRoundStart(roundId: number, roundHash: string): Promise<void> {
    logger.info(TAG, `Starting round ${roundId} on-chain...`);
    await startRoundOnChain(roundId);
  }

  /**
   * Called by the engine when a round crashes.
   * 1. Calls settle_round on-chain.
   * 2. Persists the round and all bets to PostgreSQL.
   * 3. Updates per-player stats.
   */
  async onRoundEnd(
    roundId: number,
    crashPoint: number,
    roundSeed: string,
    roundHash: string,
    bets: ActiveBet[]
  ): Promise<void> {
    const crashedAt = new Date();

    // ── 1. Settle on-chain ──
    const crashPointBps = crashPointToBps(crashPoint);
    const settleTx = await settleRoundOnChain(roundId, crashPointBps, roundHash);

    // ── 2. Compute round financials ──
    const totalBets = bets.reduce((s, b) => s + b.betAmount, 0);
    const totalPayout = bets
      .filter((b) => b.status === "cashed_out")
      .reduce((s, b) => s + b.betAmount + (b.profit ?? 0), 0);
    const houseProfit = totalBets - totalPayout;

    // ── 3. Persist round to DB ──
    try {
      await this.prisma.$transaction(async (tx) => {
        // Upsert Round record (use roundNumber as the stable key)
        const round = await tx.round.upsert({
          where: { roundNumber: roundId },
          create: {
            roundNumber: roundId,
            crashPoint,
            seedHash: roundHash,
            seed: roundSeed,
            settleTx: settleTx ?? undefined,
            totalBets,
            totalPayout,
            playerCount: bets.length,
            houseProfit,
            startedAt: new Date(Date.now() - 30_000), // approximate
            crashedAt,
          },
          update: {
            crashPoint,
            seed: roundSeed,
            settleTx: settleTx ?? undefined,
            totalBets,
            totalPayout,
            playerCount: bets.length,
            houseProfit,
            crashedAt,
          },
        });

        // Create Bet records
        if (bets.length > 0) {
          await tx.bet.createMany({
            data: bets.map((b) => ({
              walletAddress: b.walletAddress,
              roundId: round.id,
              amount: b.betAmount,
              autoCashOut: b.autoCashOut ?? undefined,
              cashedOutAt: b.cashedOutAt ?? undefined,
              payout:
                b.status === "cashed_out"
                  ? b.betAmount + (b.profit ?? 0)
                  : 0,
              profit: b.profit ?? -b.betAmount,
              status: b.status,
              txSignature: b.txSignature ?? undefined,
              cashOutTx: (b as any).cashOutTx ?? undefined,
            })),
            skipDuplicates: true,
          });
        }

        // Update PlayerStats for each participant
        for (const bet of bets) {
          const profit = bet.profit ?? -bet.betAmount;
          const won = bet.status === "cashed_out";
          await tx.playerStats.upsert({
            where: { walletAddress: bet.walletAddress },
            create: {
              walletAddress: bet.walletAddress,
              totalWagered: bet.betAmount,
              totalProfit: profit,
              totalPayout: won ? bet.betAmount + profit : 0,
              biggestWin: won ? Math.max(0, profit) : 0,
              biggestMulti: bet.cashedOutAt ?? 1,
              gamesPlayed: 1,
              gamesWon: won ? 1 : 0,
            },
            update: {
              totalWagered: { increment: bet.betAmount },
              totalProfit: { increment: profit },
              totalPayout: { increment: won ? bet.betAmount + profit : 0 },
              biggestWin: won
                ? { set: Math.max(0, profit) }
                : undefined,
              biggestMulti: bet.cashedOutAt
                ? { set: bet.cashedOutAt }
                : undefined,
              gamesPlayed: { increment: 1 },
              gamesWon: { increment: won ? 1 : 0 },
            },
          });
        }

        logger.info(
          TAG,
          `Round ${roundId} saved to DB. ` +
            `Crash: ${crashPoint}x | Bets: ${totalBets.toFixed(4)} SOL | ` +
            `Payout: ${totalPayout.toFixed(4)} SOL | House: ${houseProfit.toFixed(4)} SOL`
        );
      });
    } catch (err) {
      logger.error(TAG, `Failed to persist round ${roundId} to DB`, err);
    }
  }
}
