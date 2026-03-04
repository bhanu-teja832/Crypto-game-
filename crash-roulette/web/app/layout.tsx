import type { Metadata } from "next";
import "@/styles/globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "CrashRoulette — Provably Fair on Solana",
  description:
    "Watch the multiplier climb and cash out before it crashes. " +
    "Provably fair crash game on Solana Devnet.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <WalletProvider>
          <SocketProvider>
            <ToastProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </ToastProvider>
          </SocketProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
