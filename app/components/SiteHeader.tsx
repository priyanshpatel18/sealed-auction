"use client";

import Link from "next/link";
import { SiteHeaderWallet } from "@/components/SiteHeaderWallet";

export function SiteHeader() {
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
            <Link
              href="/create-auction"
              className="text-brand-muted transition hover:text-brand-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
            >
              Create
            </Link>
            <Link
              href="/auction"
              className="text-brand-muted transition hover:text-brand-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
            >
              Trade
            </Link>
            <SiteHeaderWallet />
          </nav>
        </div>
      </header>
    </>
  );
}
