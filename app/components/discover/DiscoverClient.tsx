"use client";

import { ProgramAuctionsGrid } from "@/components/discover/ProgramAuctionsGrid";

export function DiscoverClient() {
  return (
    <div className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:py-16 sm:pb-24">
        <h1 className="text-4xl font-semibold tracking-tight text-brand-cream sm:text-5xl">
          Discover auctions
        </h1>

        <div className="mt-10">
          <ProgramAuctionsGrid />
        </div>
      </div>
    </div>
  );
}
