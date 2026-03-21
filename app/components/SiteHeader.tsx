"use client";

import Link from "next/link";
import { useState } from "react";
import { CreateAuctionDialog } from "@/components/auction/CreateAuctionDialog";

export function SiteHeader() {
  const [toast, setToast] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 h-[var(--site-header-height)] shrink-0 border-b border-brand-muted/50 bg-brand-bg/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-brand-bg/70">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
          >
            MagicBlock<span className="text-brand-lime">.</span>
          </Link>
          <nav
            className="flex flex-wrap items-center justify-end gap-4 text-base font-medium sm:gap-6"
            aria-label="Main"
          >
            <Link
              href="/"
              className="text-brand-muted transition hover:text-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
            >
              Home
            </Link>
            <Link
              href="/discover"
              className="text-brand-muted transition hover:text-brand-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
            >
              Discover
            </Link>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="text-brand-muted transition hover:text-brand-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setToast(true)}
              className="rounded-full border border-brand-muted bg-brand-cream/5 px-5 py-2 text-base text-brand-cream transition hover:border-brand-lime/60 hover:bg-brand-lime/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
            >
              Connect wallet
            </button>
          </nav>
        </div>
      </header>
      <CreateAuctionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-xl border border-brand-muted bg-brand-bg px-4 py-3 text-center text-sm text-brand-cream shadow-lg"
        >
          Demo only — no wallet connection in this prototype.
          <button
            type="button"
            className="mt-2 block w-full text-xs font-semibold text-brand-lime"
            onClick={() => setToast(false)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}
