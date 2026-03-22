"use client";

import { ProgramAuctionsGrid } from "@/components/discover/ProgramAuctionsGrid";

export function DiscoverClient() {
  return (
    <div className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:py-16 sm:pb-24">
        <h1 className="text-4xl font-semibold tracking-tight text-brand-cream sm:text-5xl">
          Discover auctions
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted">
          Listings are read from your program on{" "}
          <code className="text-xs text-brand-cream/85">NEXT_PUBLIC_BASE_RPC</code>
          . Cards show a short preview (title, description snippet, image) from IPFS metadata; open
          an auction for seller, id, commits, and full schedule. Default view is auctions still
          accepting sealed bids.
        </p>

        <div className="mt-10">
          <ProgramAuctionsGrid />
        </div>
      </div>
    </div>
  );
}
