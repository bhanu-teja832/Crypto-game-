"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/ui/WalletButton";
import { BalanceDisplay } from "@/components/ui/BalanceDisplay";

const NAV = [
  { href: "/",            label: "Play" },
  { href: "/history",     label: "History" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/fairness",    label: "Fairness" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl">🎲</span>
          <span className="font-black text-lg tracking-tight text-primary">
            Crash<span className="text-accent">Roulette</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-accent/15 text-accent"
                  : "text-secondary hover:text-primary hover:bg-border/50"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          <BalanceDisplay />
          <WalletButton />
        </div>
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden flex border-t border-border">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
              pathname === href
                ? "text-accent border-b-2 border-accent"
                : "text-secondary"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
