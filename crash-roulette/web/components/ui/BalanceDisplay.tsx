"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getSolBalance } from "@/lib/solana";

export function BalanceDisplay() {
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey || !connected) { setBalance(null); return; }

    let cancelled = false;

    const fetch = async () => {
      try {
        const b = await getSolBalance(publicKey);
        if (!cancelled) setBalance(b);
      } catch {
        if (!cancelled) setBalance(null);
      }
    };

    fetch();
    const id = setInterval(fetch, 10_000); // refresh every 10s
    return () => { cancelled = true; clearInterval(id); };
  }, [publicKey, connected]);

  if (!connected || balance === null) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-muted">◎</span>
      <span className="font-mono font-semibold text-primary">
        {balance.toFixed(4)}
      </span>
      <span className="text-muted text-xs">SOL</span>
    </div>
  );
}
