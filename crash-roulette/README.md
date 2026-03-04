# Crash Roulette

A provably fair multiplier betting game on Solana. Players wager SOL, watch a
multiplier climb in real-time, and must cash out before it crashes.

## Architecture

```
crash-roulette/
├── anchor/     # Solana smart contract (Anchor/Rust)
├── server/     # Node.js game engine + WebSocket server
├── shared/     # Shared TypeScript types and constants
└── web/        # Next.js 14 frontend
```

## Prerequisites

- Node.js ≥ 18
- Rust + Solana CLI + Anchor CLI (for smart contract)
- Docker (for local PostgreSQL)

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd crash-roulette
npm install

# 2. Set up environment
cp .env.example server/.env
cp .env.example web/.env.local
# Edit both files with your values

# 3. Start the database
docker compose up -d

# 4. Run database migrations
npm run db:migrate

# 5. Start server (Terminal A)
npm run dev:server

# 6. Start frontend (Terminal B)
npm run dev:web
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana (Anchor framework) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, Socket.IO |
| Wallet | Solana Wallet Adapter (Phantom) |
| Database | PostgreSQL + Prisma ORM |
| Fairness | HMAC-SHA256 provably fair crash points |

## Provably Fair

Each round's crash point is determined before bets are placed using HMAC-SHA256.
After the round, the seed is published so anyone can independently verify the result.

Visit `/fairness` in the app to verify any historical round.

## Network

Configured for **Solana Devnet** by default. Change `SOLANA_NETWORK` in `.env`
to `mainnet-beta` for production (get a professional audit first).
