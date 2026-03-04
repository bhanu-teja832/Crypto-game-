"use client";
import type { PlayerBet } from "@/lib/types";
import { useWallet } from "@solana/wallet-adapter-react";

interface PlayerListProps {
  players: PlayerBet[];
}

function PlayerRow({
  player,
  isMe,
}: {
  player: PlayerBet;
  isMe: boolean;
}) {
  const isCashedOut = player.status === "cashed_out";
  const isBusted    = player.status === "busted";

  return (
    <div
      className={`flex items-center justify-between py-2 px-3 rounded-xl text-sm
                  transition-all duration-300 ${
                    isMe
                      ? "bg-accent/10 border border-accent/30"
                      : "hover:bg-border/50"
                  }`}
    >
      {/* Left: wallet + bet */}
      <div className="flex items-center gap-2 min-w-0">
        {isMe && (
          <span className="text-xs font-bold text-accent uppercase">You</span>
        )}
        <span className="font-mono text-secondary truncate">
          {player.displayName}
        </span>
        <span className="text-muted text-xs font-mono">
          {player.betAmount.toFixed(3)} SOL
        </span>
      </div>

      {/* Right: status */}
      <div className="flex-shrink-0 ml-2">
        {isCashedOut && player.cashedOutAt !== null ? (
          <div className="flex items-center gap-1.5">
            <span className="pill-cashout">
              {player.cashedOutAt.toFixed(2)}×
            </span>
            {player.profit !== null && player.profit > 0 && (
              <span className="text-xs font-mono text-cashout">
                +{player.profit.toFixed(3)}
              </span>
            )}
          </div>
        ) : isBusted ? (
          <span className="pill-crash">Bust</span>
        ) : (
          <span className="flex items-center gap-1 text-accent text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Active
          </span>
        )}
      </div>
    </div>
  );
}

export function PlayerList({ players }: PlayerListProps) {
  const { publicKey } = useWallet();
  const myAddress = publicKey?.toBase58();

  const sorted = [...players].sort((a, b) => {
    // My bet always first
    if (a.walletAddress === myAddress) return -1;
    if (b.walletAddress === myAddress) return 1;
    // Cashed-out after active
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    // Sort by bet descending
    return b.betAmount - a.betAmount;
  });

  if (players.length === 0) {
    return (
      <div className="text-xs text-muted text-center py-4">
        No players yet — be the first!
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
      {sorted.map((p) => (
        <PlayerRow
          key={p.walletAddress}
          player={p}
          isMe={p.walletAddress === myAddress}
        />
      ))}
    </div>
  );
}
