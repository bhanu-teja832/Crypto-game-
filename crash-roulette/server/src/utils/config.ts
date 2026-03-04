import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: parseInt(optional("PORT", "4000"), 10),

  // ─── Security ───
  serverSecret: required("SERVER_SECRET"),

  // ─── Database ───
  databaseUrl: required("DATABASE_URL"),

  // ─── Solana ───
  solanaRpcUrl: optional("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
  solanaNetwork: optional("SOLANA_NETWORK", "devnet") as "devnet" | "mainnet-beta" | "localnet",
  programId: optional("PROGRAM_ID", "CRaSHRouLetteProgram111111111111111111111111"),
  houseKeypairPath: optional(
    "HOUSE_KEYPAIR_PATH",
    `${process.env.HOME}/.config/solana/devnet.json`
  ),

  // ─── CORS ───
  frontendUrl: optional("FRONTEND_URL", "http://localhost:3000"),
} as const;
