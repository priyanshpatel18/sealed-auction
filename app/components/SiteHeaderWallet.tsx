"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type WalletName,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";

/**
 * Solana Wallet Standard registers a "MetaMask" entry (Solana via Snaps). It fails with
 * "MetaMask extension not found" when Snaps aren't available — we hide it so users pick
 * Phantom or Solflare instead.
 */
function isProblematicWalletName(name: string): boolean {
  const n = name.toLowerCase();
  return n === "metamask" || n.includes("metamask");
}

const btnClass =
  "inline-flex min-h-[40px] items-center justify-center rounded-full border border-brand-muted bg-brand-cream/5 px-5 text-sm font-medium text-brand-cream transition hover:border-brand-lime/60 hover:bg-brand-lime/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime disabled:pointer-events-none disabled:opacity-45";

export function SiteHeaderWallet() {
  const {
    publicKey,
    connected,
    connecting,
    disconnect,
    connect,
    select,
    wallets,
  } = useWallet();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const safeWallets = useMemo(
    () => wallets.filter((w) => !isProblematicWalletName(w.adapter.name)),
    [wallets]
  );

  const onPickWallet = useCallback(
    async (name: WalletName) => {
      setOpen(false);
      try {
        await select(name);
        await connect();
      } catch (e) {
        console.warn("[wallet connect]", e);
      }
    },
    [connect, select]
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!mounted) {
    return (
      <div className="site-header-wallet">
        <div
          className="h-10 min-w-[148px] rounded-full border border-brand-muted/60 bg-brand-cream/5"
          aria-hidden
        />
      </div>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="site-header-wallet flex flex-wrap items-center justify-end gap-2">
        <span
          className="max-w-[140px] truncate font-mono text-xs text-brand-muted sm:max-w-[180px]"
          title={publicKey.toBase58()}
        >
          {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
        </span>
        <button type="button" className={btnClass} onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="site-header-wallet relative" ref={panelRef}>
      <button
        type="button"
        className={btnClass}
        onClick={() => setOpen((o) => !o)}
        disabled={connecting}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {open ? (
        <ul
          className="absolute right-0 z-50 mt-2 min-w-[220px] rounded-xl border border-brand-muted/60 bg-brand-bg py-1 shadow-lg"
          role="listbox"
        >
          {safeWallets.length === 0 ? (
            <li className="px-4 py-3 text-xs text-brand-muted">
              No Solana wallets detected. Install{" "}
              <a
                href="https://phantom.app"
                target="_blank"
                rel="noreferrer"
                className="text-brand-lime underline"
              >
                Phantom
              </a>
              .
            </li>
          ) : (
            safeWallets.map((w) => {
              const installed = w.readyState === WalletReadyState.Installed;
              return (
                <li key={w.adapter.name} role="option">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-brand-cream hover:bg-brand-lime/10"
                    onClick={() =>
                      onPickWallet(w.adapter.name as WalletName)
                    }
                  >
                    <span>{w.adapter.name}</span>
                    <span className="text-[0.65rem] uppercase text-brand-muted">
                      {installed ? "Detected" : "Install"}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
