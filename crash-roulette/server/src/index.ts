import express from "express";
import http from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { config } from "./utils/config";
import { logger } from "./utils/logger";
import { GameEngine } from "./game/engine";
import { RoundManager } from "./game/round-manager";
import { registerSocketHandlers } from "./ws/handler";
import { createRouter } from "./api/routes";

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// ─── Database ─────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  log: process.env.DEBUG ? ["query", "info", "warn", "error"] : ["warn", "error"],
});

// ─── Game Engine ──────────────────────────────────────────────────────────────

const roundManager = new RoundManager(prisma);
const engine = new GameEngine(io, roundManager);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

// ─── REST API ─────────────────────────────────────────────────────────────────

app.use("/api", createRouter(prisma));

// ─── WebSocket ────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  // Send current game state immediately on connect
  socket.emit("game:state", engine.getState());

  // Register all event handlers for this socket
  registerSocketHandlers(socket as any, engine, io);
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  // Verify database connection
  try {
    await prisma.$connect();
    logger.info("DB", "PostgreSQL connected");
  } catch (err) {
    logger.error("DB", "Failed to connect to PostgreSQL. Is the DB running?", err);
    logger.error("DB", "Start it with: docker compose up -d");
    process.exit(1);
  }

  // Start listening
  server.listen(config.port, () => {
    logger.info("Server", `Crash Roulette server running on port ${config.port}`);
    logger.info("Server", `Frontend URL: ${config.frontendUrl}`);
    logger.info("Server", `Solana network: ${config.solanaNetwork}`);
    logger.info("Server", `Program ID: ${config.programId}`);
  });

  // Start the game engine (first round begins after 2 seconds)
  engine.start();
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

process.on("SIGTERM", async () => {
  logger.info("Server", "SIGTERM received, shutting down...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on("SIGINT", async () => {
  logger.info("Server", "SIGINT received, shutting down...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

main().catch((err) => {
  logger.error("Server", "Fatal startup error", err);
  process.exit(1);
});
