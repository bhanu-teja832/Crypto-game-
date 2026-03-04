"use client";
import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SOLANA_RPC } from "@/lib/constants";

// Import default wallet adapter styles (overridden in globals.css)
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletProviderProps {
  children: React.ReactNode;
}

/**
 * Provides Solana wallet connection context to the entire app.
 * Supports Phantom wallet on Devnet.
 *
 * Usage: wrap your root layout with this component.
 */
export function WalletProvider({ children }: WalletProviderProps) {
  // Memoize adapters so they don't re-instantiate on every render
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
