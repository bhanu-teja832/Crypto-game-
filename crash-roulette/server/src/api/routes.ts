import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyCrashPoint } from "../game/crash-point";
import { logger } from "../utils/logger";

export function createRouter(prisma: PrismaClient): Router {
  const router = Router();

  // GET /api/health
  router.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // GET /api/history?page=1&limit=20
  router.get("/history", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
      const skip = (page - 1) * limit;

      const [rounds, total] = await prisma.$transaction([
        prisma.round.findMany({
          orderBy: { crashedAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            roundNumber: true,
            crashPoint: true,
            seedHash: true,
            totalBets: true,
            totalPayout: true,
            playerCount: true,
            startedAt: true,
            crashedAt: true,
          },
        }),
        prisma.round.count(),
      ]);

      res.json({ rounds, total, page, pageSize: limit });
    } catch (err) {
      logger.error("API", "GET /history failed", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/history/:roundNumber
  router.get("/history/:roundNumber", async (req, res) => {
    try {
      const roundNumber = parseInt(req.params.roundNumber, 10);
      const round = await prisma.round.findUnique({
        where: { roundNumber },
        include: {
          bets: {
            select: {
              walletAddress: true,
              amount: true,
              cashedOutAt: true,
              profit: true,
              status: true,
            },
          },
        },
      });

      if (!round) {
        res.status(404).json({ error: "Round not found" });
        return;
      }

      res.json(round);
    } catch (err) {
      logger.error("API", "GET /history/:id failed", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/leaderboard?sort=profit&limit=50
  router.get("/leaderboard", async (req, res) => {
    try {
      const sort = String(req.query.sort ?? "totalProfit");
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));

      const allowed = ["totalProfit", "totalWagered", "biggestWin", "biggestMulti", "gamesPlayed"];
      const orderField = allowed.includes(sort) ? sort : "totalProfit";

      const entries = await prisma.playerStats.findMany({
        orderBy: { [orderField]: "desc" },
        take: limit,
      });

      const enriched = entries.map((e) => ({
        ...e,
        displayName: `${e.walletAddress.slice(0, 4)}...${e.walletAddress.slice(-4)}`,
        winRate: e.gamesPlayed > 0 ? e.gamesWon / e.gamesPlayed : 0,
      }));

      res.json({ entries: enriched, total: entries.length });
    } catch (err) {
      logger.error("API", "GET /leaderboard failed", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/player/:wallet
  router.get("/player/:wallet", async (req, res) => {
    try {
      const { wallet } = req.params;

      const [stats, recentBets] = await prisma.$transaction([
        prisma.playerStats.findUnique({ where: { walletAddress: wallet } }),
        prisma.bet.findMany({
          where: { walletAddress: wallet },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { round: { select: { roundNumber: true, crashPoint: true } } },
        }),
      ]);

      if (!stats) {
        res.status(404).json({ error: "Player not found" });
        return;
      }

      res.json({
        ...stats,
        displayName: `${wallet.slice(0, 4)}...${wallet.slice(-4)}`,
        winRate: stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0,
        recentBets,
      });
    } catch (err) {
      logger.error("API", "GET /player/:wallet failed", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/verify/:hash  — Provably fair verification
  router.get("/verify/:hash", async (req, res) => {
    try {
      const { hash } = req.params;

      const round = await prisma.round.findFirst({
        where: { seedHash: hash },
        select: {
          roundNumber: true,
          crashPoint: true,
          seedHash: true,
          seed: true,
        },
      });

      if (!round) {
        res.status(404).json({ error: "Round hash not found" });
        return;
      }

      // Recompute crash point from the stored seed to verify
      const { crashPoint: recomputed, hash: recomputedHash } = verifyCrashPoint(round.seed);
      const verified =
        recomputedHash === round.seedHash &&
        Math.abs(recomputed - round.crashPoint) < 0.01;

      res.json({
        roundId: round.roundNumber,
        crashPoint: round.crashPoint,
        hash: round.seedHash,
        seed: round.seed,
        recomputedCrashPoint: recomputed,
        verified,
      });
    } catch (err) {
      logger.error("API", "GET /verify/:hash failed", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
