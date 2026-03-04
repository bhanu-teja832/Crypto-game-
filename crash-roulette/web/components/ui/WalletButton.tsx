"use client";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortAddress } from "@/lib/solana";

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (connecting) {
    return (
      <button
        disabled
        className="btn-primary text-sm opacity-70 flex items-center gap-2"
      >
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Connecting...
      </button>
    );
  }

  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:block text-xs text-secondary font-mono">
          {shortAddress(publicKey.toBase58())}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-xs text-secondary hover:text-crash font-medium
                     px-3 py-1.5 rounded-lg border border-border hover:border-crash/50
                     transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="btn-primary text-sm"
    >
      Connect Wallet
    </button>
  );
}
