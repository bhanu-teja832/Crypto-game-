import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto py-6">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center
                      justify-between gap-3 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <span>🎲</span>
          <span className="font-semibold text-secondary">CrashRoulette</span>
          <span>· Provably fair · Solana Devnet</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/fairness" className="hover:text-secondary transition-colors">
            Provably Fair
          </Link>
          <a
            href="https://solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-secondary transition-colors"
          >
            Built on Solana
          </a>
        </div>

        <div>
          For entertainment. Devnet only. No real value.
        </div>
      </div>
    </footer>
  );
}
