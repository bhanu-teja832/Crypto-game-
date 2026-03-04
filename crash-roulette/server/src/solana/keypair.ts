import fs from "fs";
import { Keypair } from "@solana/web3.js";
import { config } from "../utils/config";
import { logger } from "../utils/logger";

let _houseKeypair: Keypair | null = null;

/**
 * Load (and cache) the house authority keypair from the path set in config.
 * The keypair file is a JSON array of 64 numbers (Solana CLI format).
 */
export function loadHouseKeypair(): Keypair {
  if (_houseKeypair) return _houseKeypair;

  const expandedPath = config.houseKeypairPath.replace("~", process.env.HOME ?? "");

  if (!fs.existsSync(expandedPath)) {
    throw new Error(
      `House keypair not found at: ${expandedPath}\n` +
        "Generate one with: solana-keygen new --outfile ~/.config/solana/devnet.json"
    );
  }

  const raw = JSON.parse(fs.readFileSync(expandedPath, "utf-8")) as number[];
  _houseKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));

  logger.info("Keypair", `House authority: ${_houseKeypair.publicKey.toBase58()}`);
  return _houseKeypair;
}
