"use client";

import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { BASE_ENDPOINT } from "@/lib/config";

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={BASE_ENDPOINT}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        localStorageKey="sealed-auction.wallet-v2"
        onError={(err) => {
          console.warn("[wallet]", err);
        }}
      >
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
