"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuctionArtImage } from "@/components/AuctionArtImage";
import { CategoryBadge, StatusBadge } from "@/components/ui/Badge";
import type { AuctionListing } from "@/lib/data";
import { formatTimeLeft } from "@/lib/format";

export function AuctionCard({ listing }: { listing: AuctionListing }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingSec =
    now === null || listing.status === "ended"
      ? null
      : Math.max(
          0,
          Math.floor((new Date(listing.endAt).getTime() - now) / 1000),
        );

  const timeLabel = formatTimeLeft(
    listing.status === "ended" ? null : remainingSec,
    listing.status === "ended",
  );

  return (
    <Link
      href={`/auction/${listing.id}`}
      className="auction-card group flex flex-col overflow-hidden rounded-2xl border border-brand-muted/45 bg-gradient-to-b from-brand-cream/[0.06] to-transparent transition duration-300 hover:-translate-y-1 hover:border-brand-lime/35 hover:shadow-[0_24px_48px_-28px_rgba(222,241,87,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
    >
      <div className="relative">
        <AuctionArtImage aspectClass="aspect-[16/10]" />
        <div className="absolute right-3 top-3 z-10 flex flex-wrap justify-end gap-2">
          <StatusBadge status={listing.status} />
        </div>
        <span className="absolute bottom-3 left-3 z-10">
          <CategoryBadge label={listing.category} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-semibold text-brand-cream transition group-hover:text-brand-lime">
          {listing.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-brand-muted leading-relaxed">
          {listing.shortDescription}
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-brand-muted/30 pt-4 text-xs">
          <div>
            <dt className="text-brand-muted">Time left</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-brand-cream">
              {now === null && listing.status !== "ended" ? "…" : timeLabel}
            </dd>
          </div>
          <div>
            <dt className="text-brand-muted">Sealed bids</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-brand-lime">
              {listing.bidCount}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
