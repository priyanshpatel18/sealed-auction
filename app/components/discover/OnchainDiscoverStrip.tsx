"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  loadRememberedAuctions,
  type StoredOnchainAuction,
} from "@/lib/onchainListingStorage";

function formatAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function OnchainDiscoverStrip() {
  const [items, setItems] = useState<StoredOnchainAuction[]>([]);

  useEffect(() => {
    setItems(loadRememberedAuctions());
  }, []);

  if (items.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-brand-lime/25 bg-brand-lime/5 px-5 py-4"
      aria-label="Auctions you created in this browser"
    >
      <h2 className="text-sm font-semibold text-brand-lime">Your on-chain auctions</h2>
      <p className="mt-1 text-xs text-brand-muted">
        Stored locally after you create an auction — open for live account data.
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((e) => (
          <li key={e.auctionId}>
            <Link
              href={`/auction/live/${e.auctionId}`}
              className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-brand-cream underline-offset-4 hover:text-brand-lime hover:underline"
            >
              <span>
                ID <span className="font-mono">{e.auctionId}</span>
              </span>
              <span className="text-xs font-normal text-brand-muted">
                {formatAgo(e.at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
