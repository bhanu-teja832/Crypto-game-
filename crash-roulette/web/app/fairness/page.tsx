"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useVerify } from "@/hooks/useHistory";

function FairnessContent() {
  const searchParams = useSearchParams();
  const [inputHash, setInputHash] = useState(searchParams.get("hash") ?? "");
  const [submitHash, setSubmitHash] = useState(searchParams.get("hash") ?? "");

  const { result, loading, error } = useVerify(submitHash || null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">Provably Fair Verification</h1>
        <p className="text-secondary text-sm mt-2 leading-relaxed">
          Every crash point is determined before betting opens using HMAC-SHA256.
          After each round, the seed is revealed so you can independently verify
          the result was not manipulated.
        </p>
      </div>

      {/* How it works */}
      <div className="card space-y-3 text-sm">
        <h2 className="font-semibold text-primary">How it works</h2>
        <ol className="space-y-2 text-secondary list-decimal list-inside">
          <li>
            Before betting opens, the server generates a random 32-byte{" "}
            <strong className="text-primary">seed</strong>.
          </li>
          <li>
            The seed is hashed with SHA-256 to produce the{" "}
            <strong className="text-primary">round hash</strong>, which is published.
          </li>
          <li>
            The crash point is computed:{" "}
            <code className="bg-border px-1 rounded text-accent text-xs">
              HMAC-SHA256(serverSecret, seed)
            </code>{" "}
            — the server cannot change it after bets are placed.
          </li>
          <li>
            After the crash, the seed is revealed. You can verify:{" "}
            <code className="bg-border px-1 rounded text-xs text-accent">
              SHA256(seed) === published hash
            </code>
          </li>
        </ol>
      </div>

      {/* Verify form */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-primary">Verify a Round</h2>
        <p className="text-secondary text-xs">
          Enter the seed hash from any historical round. Find it in the
          History page or in the crash event data.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputHash}
            onChange={(e) => setInputHash(e.target.value)}
            placeholder="Paste the 64-char seed hash here..."
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5
                       text-primary font-mono text-sm
                       focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                       placeholder:text-muted"
          />
          <button
            onClick={() => setSubmitHash(inputHash.trim())}
            disabled={loading || !inputHash.trim()}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-crash/10 border border-crash/30 px-4 py-3 text-crash text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`rounded-xl border px-4 py-4 space-y-3 text-sm ${
              result.verified
                ? "bg-cashout/10 border-cashout/30"
                : "bg-crash/10 border-crash/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{result.verified ? "✅" : "❌"}</span>
              <span className={`font-bold ${result.verified ? "text-cashout" : "text-crash"}`}>
                {result.verified ? "Verified — result is fair!" : "Verification failed!"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-muted uppercase tracking-wide">Round</div>
                <div className="font-mono text-secondary">#{result.roundId}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted uppercase tracking-wide">Crash Point</div>
                <div className="font-mono font-bold text-primary">{result.crashPoint.toFixed(2)}×</div>
              </div>
              <div className="space-y-1 col-span-2">
                <div className="text-muted uppercase tracking-wide">Seed (revealed post-crash)</div>
                <div className="font-mono text-secondary break-all">{result.seed}</div>
              </div>
              <div className="space-y-1 col-span-2">
                <div className="text-muted uppercase tracking-wide">SHA-256(seed)</div>
                <div className="font-mono text-secondary break-all">{result.hash}</div>
              </div>
              <div className="space-y-1 col-span-2">
                <div className="text-muted uppercase tracking-wide">Recomputed crash point</div>
                <div className={`font-mono font-semibold ${
                  result.verified ? "text-cashout" : "text-crash"
                }`}>
                  {result.recomputedCrashPoint.toFixed(2)}×{" "}
                  <span className="text-muted font-normal">
                    ({result.verified ? "matches" : "MISMATCH"})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Algorithm note */}
      <div className="card text-xs text-muted space-y-2">
        <h3 className="text-secondary font-semibold">Verification algorithm</h3>
        <pre className="bg-background rounded-lg p-3 overflow-x-auto text-xs text-secondary leading-relaxed">
{`// 1. Verify hash matches the seed
SHA-256(seed) === publishedHash

// 2. Recompute crash point
hmac = HMAC-SHA256(SERVER_SECRET, seed)
h    = parseInt(hmac.slice(0, 13), 16)
e    = 2^52
if (h % 33 === 0) → crashPoint = 1.00x  // instant crash
else → raw = (100e - h) / (e - h)
       crashPoint = floor(raw × 0.97) / 100  // 3% house edge`}
        </pre>
      </div>
    </div>
  );
}

export default function FairnessPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 text-muted">Loading...</div>}>
      <FairnessContent />
    </Suspense>
  );
}
