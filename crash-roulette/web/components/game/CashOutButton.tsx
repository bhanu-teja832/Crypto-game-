"use client";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface CashOutButtonProps {
  onCashOut: () => void;
  canCashOut: boolean;
  isCashingOut: boolean;
  multiplier: number;
  betAmount: string;
}

export function CashOutButton({
  onCashOut,
  canCashOut,
  isCashingOut,
  multiplier,
  betAmount,
}: CashOutButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fire confetti from the button's position on cash-out
  const handleClick = () => {
    if (!canCashOut || isCashingOut) return;

    onCashOut();

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ["#34d399", "#818cf8", "#f59e0b", "#fff"],
      });
    }
  };

  const potentialPayout = (parseFloat(betAmount) * multiplier).toFixed(4);
  const profit          = ((parseFloat(betAmount) * multiplier) - parseFloat(betAmount)).toFixed(4);

  if (!canCashOut && !isCashingOut) return null;

  return (
    <div className="space-y-2">
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={!canCashOut || isCashingOut}
        className="w-full py-5 text-xl font-black rounded-2xl uppercase tracking-wide
                   bg-cashout hover:brightness-110 text-background
                   active:scale-95 transition-all duration-150
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                   shadow-cashout animate-pulse-fast"
        style={{ animationPlayState: isCashingOut ? "paused" : "running" }}
      >
        {isCashingOut ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Cashing out...
          </span>
        ) : (
          <>Cash Out {multiplier.toFixed(2)}×</>
        )}
      </button>

      {/* Payout preview */}
      <div className="flex justify-between text-xs text-secondary px-1">
        <span>Payout</span>
        <span className="font-mono font-semibold text-cashout">
          {potentialPayout} SOL
          <span className="text-muted ml-1">(+{profit})</span>
        </span>
      </div>
    </div>
  );
}
