"use client";

import { OnchainDiscoverStrip } from "@/components/discover/OnchainDiscoverStrip";
import { ProgramAuctionsGrid } from "@/components/discover/ProgramAuctionsGrid";

export function DiscoverClient() {
  return (
    <div className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:py-16 sm:pb-24">
        <h1 className="text-4xl font-semibold tracking-tight text-brand-cream sm:text-5xl">
          Discover auctions
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted">
          Listings are read from your deployed program on{" "}
          <code className="text-xs text-brand-cream/85">NEXT_PUBLIC_BASE_RPC</code>
          . Each card shows title, description, and cover image from the IPFS
          metadata URL stored in each auction account. Default view is auctions still accepting
          sealed bids.
        </p>

        <div className="mt-10 space-y-10">
          <ProgramAuctionsGrid />
          <OnchainDiscoverStrip />
        </div>
      </div>
    </div>
  );
}
