"use client";
import { useState, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getSocket } from "@/lib/socket";
import { sendPlaceBetTx, signAndSendCashOutTx } from "@/lib/solana";
import { MIN_BET, MAX_BET } from "@/lib/constants";
import type { GamePhase } from "@/lib/types";

interface UseBetOptions {
  phase: GamePhase;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

/**
 * Manages the full bet lifecycle:
 *   1. Validate form inputs.
 *   2. Build + sign the place_bet Solana transaction.
 *   3. Notify the server (bet:place) with the tx signature.
 *   4. Handle cash-out: receive partial tx from server, player co-signs, broadcast.
 */
export function useBet({ phase, onSuccess, onError }: UseBetOptions) {
  const wallet = useWallet();
  const [amount, setAmount]           = useState("0.10");
  const [autoCashOut, setAutoCashOut] = useState("");
  const [isPlacing, setIsPlacing]     = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [hasBet, setHasBet]           = useState(false);

  // Track the current round so we reset hasBet when a new round starts
  const roundRef = useRef<string>("");

  /** Reset bet state at the start of a new round. */
  const resetForNewRound = useCallback((newRoundId: string) => {
    if (roundRef.current !== newRoundId) {
      roundRef.current = newRoundId;
      setHasBet(false);
      setIsPlacing(false);
      setIsCashingOut(false);
    }
  }, []);

  /** Validate the current form values. Returns error string or null. */
  const validate = useCallback((): string | null => {
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) return "Enter a valid bet amount";
    if (a < MIN_BET) return `Minimum bet is ${MIN_BET} SOL`;
    if (a > MAX_BET) return `Maximum bet is ${MAX_BET} SOL`;

    if (autoCashOut) {
      const ac = parseFloat(autoCashOut);
      if (isNaN(ac) || ac < 1.01) return "Auto cash-out must be ≥ 1.01x";
      if (ac > 1000)              return "Auto cash-out must be ≤ 1000x";
    }

    return null;
  }, [amount, autoCashOut]);

  /**
   * Place a bet:
   *   1. Validate inputs.
   *   2. Send Solana tx (SOL → pool PDA).
   *   3. Emit bet:place to server with tx signature.
   */
  const placeBet = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      onError?.("Connect your wallet first");
      return;
    }

    const err = validate();
    if (err) { onError?.(err); return; }

    if (phase !== "waiting" && phase !== "countdown") {
      onError?.("Betting is closed — wait for the next round");
      return;
    }

    if (hasBet) {
      onError?.("You already have a bet this round");
      return;
    }

    setIsPlacing(true);

    try {
      const amountSol = parseFloat(amount);
      const autoCashOutVal = autoCashOut ? parseFloat(autoCashOut) : undefined;

      // Submit on-chain tx
      const txSignature = await sendPlaceBetTx(wallet, amountSol, autoCashOutVal);

      // Tell server about the bet
      const socket = getSocket();
      socket.emit("bet:place", {
        amount: amountSol,
        autoCashOut: autoCashOutVal,
        txSignature,
      });

      setHasBet(true);
      onSuccess?.(`Bet placed: ${amountSol} SOL`);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to place bet";
      onError?.(msg.includes("rejected") ? "Transaction rejected" : msg);
    } finally {
      setIsPlacing(false);
    }
  }, [wallet, validate, phase, hasBet, amount, autoCashOut, onSuccess, onError]);

  /**
   * Cash out:
   *   1. Emit bet:cashOut to server (locks multiplier).
   *   2. Server returns cashout:sign_tx with partial tx.
   *   3. Player signs and broadcasts.
   *   4. Emit cashout:confirmed with tx signature.
   */
  const cashOut = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      onError?.("Wallet not connected");
      return;
    }

    if (!hasBet || phase !== "running") return;

    setIsCashingOut(true);
    const socket = getSocket();

    // Request cash-out from server
    socket.emit("bet:cashOut");

    // Listen for the partially-signed tx from the server
    const onSignTx = async ({
      tx: partialTxBase64,
      multiplier,
    }: {
      tx: string;
      multiplier: number;
      multiplierBps: number;
      roundId: number;
    }) => {
      socket.off("cashout:sign_tx", onSignTx);

      try {
        const txSignature = await signAndSendCashOutTx(wallet, partialTxBase64);
        socket.emit("cashout:confirmed", { txSignature });
        onSuccess?.(`Cashed out at ${multiplier.toFixed(2)}x!`);
      } catch (err: any) {
        // Even if on-chain tx fails, the server has recorded it
        onError?.(err?.message ?? "Cash-out tx failed");
      } finally {
        setIsCashingOut(false);
        setHasBet(false);
      }
    };

    // Fallback: server may emit cashout:ok directly if tx building failed
    const onCashoutOk = ({ multiplier }: { multiplier?: number }) => {
      socket.off("cashout:sign_tx", onSignTx);
      socket.off("cashout:ok", onCashoutOk);
      onSuccess?.(multiplier ? `Cashed out at ${multiplier.toFixed(2)}x!` : "Cashed out!");
      setIsCashingOut(false);
      setHasBet(false);
    };

    const onCashoutError = ({ message }: { message: string }) => {
      socket.off("cashout:sign_tx", onSignTx);
      socket.off("cashout:ok", onCashoutOk);
      socket.off("cashout:error", onCashoutError);
      onError?.(message);
      setIsCashingOut(false);
    };

    socket.once("cashout:sign_tx", onSignTx);
    socket.once("cashout:ok", onCashoutOk);
    socket.once("cashout:error", onCashoutError);

    // Timeout guard — if server doesn't respond in 5s
    setTimeout(() => {
      socket.off("cashout:sign_tx", onSignTx);
      socket.off("cashout:ok", onCashoutOk);
      socket.off("cashout:error", onCashoutError);
      setIsCashingOut(false);
    }, 5000);
  }, [wallet, hasBet, phase, onSuccess, onError]);

  const canBet = (phase === "waiting" || phase === "countdown") && !hasBet;
  const canCashOut = phase === "running" && hasBet && !isCashingOut;

  return {
    // Form state
    amount,
    setAmount,
    autoCashOut,
    setAutoCashOut,
    // Actions
    placeBet,
    cashOut,
    resetForNewRound,
    // Status
    isPlacing,
    isCashingOut,
    hasBet,
    canBet,
    canCashOut,
    // Validation
    validate,
  };
}
