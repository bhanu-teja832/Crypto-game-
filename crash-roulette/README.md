# 🎲 Crash Roulette

> Provably fair multiplier betting game on Solana Devnet.
> Watch the multiplier climb — cash out before it crashes or lose your bet.

## Architecture

```
crash-roulette/
├── anchor/   # Solana smart contract — 6 instructions, 3 state accounts
├── server/   # Node.js game engine, WebSocket server, Prisma + PostgreSQL
├── shared/   # Shared TypeScript types and constants
└── web/      # Next.js 14 frontend — dark purple/indigo theme
```

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Blockchain | Solana (Anchor framework, Rust)         |
| Frontend   | Next.js 14, TypeScript, Tailwind CSS    |
| Backend    | Node.js, Express, Socket.IO             |
| Wallet     | Solana Wallet Adapter (Phantom)         |
| Database   | PostgreSQL + Prisma ORM                 |
| Fairness   | HMAC-SHA256 provably fair crash points  |

## Prerequisites

- Node.js ≥ 18, Docker
- Rust + Solana CLI + Anchor CLI (for smart contract)

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/bhanu-teja832/Crypto-game-
cd Crypto-game-/crash-roulette
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure server
cd server && cp .env.example .env
# Set SERVER_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Run database migrations
npx prisma migrate dev --name init && npx prisma generate

# 5. Configure frontend
cd ../web && cp .env.local.example .env.local

# 6. Deploy Solana program (devnet)
cd ../anchor
solana-keygen new --outfile ~/.config/solana/devnet.json
solana config set --url devnet && solana airdrop 5
anchor build
anchor keys list          # copy your program ID
# Paste program ID into lib.rs declare_id!(), Anchor.toml, server/.env, web/.env.local
anchor build && anchor deploy --provider.cluster devnet

# 7. Start servers
cd ../server && npm run dev    # Terminal A
cd ../web    && npm run dev    # Terminal B
# Open http://localhost:3000
```

## Smart Contract Instructions

| Instruction     | Signers            | Description |
|----------------|--------------------|-------------|
| `initialize`   | Authority          | Create GamePool PDA |
| `start_round`  | Authority          | Open new GameRound |
| `place_bet`    | Player             | Transfer SOL to pool |
| `cash_out`     | Player + Authority | Dual-signed payout |
| `settle_round` | Authority          | Record crash + hash |
| `withdraw`     | Authority          | Pull house profits |

## WebSocket Events

**Server → Client:** `game:state`, `game:tick`, `game:crash`, `game:countdown`,
`player:joined`, `player:cashedOut`, `cashout:sign_tx`

**Client → Server:** `auth:wallet`, `bet:place`, `bet:cashOut`, `cashout:confirmed`

## REST API

- `GET /api/history` — paginated round history
- `GET /api/history/:roundNumber` — single round with bets
- `GET /api/leaderboard` — player rankings (sortable)
- `GET /api/player/:wallet` — player stats
- `GET /api/verify/:hash` — provably fair verification

## Provably Fair

Each round's crash point is determined before bets are placed using HMAC-SHA256.
After the crash, the seed is published so anyone can independently verify the result.

Visit **/fairness** in the app to verify any historical round.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Main game — graph, bet controls, player list |
| `/history` | Paginated round history with verify links |
| `/leaderboard` | Top players by profit, wagered, best multiplier |
| `/fairness` | Provably fair seed + hash verification tool |

## Network

Configured for **Solana Devnet** by default.
**Do not deploy to mainnet without a professional security audit.**
