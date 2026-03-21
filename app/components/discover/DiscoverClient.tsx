"use client";

import { useMemo, useState } from "react";
import { AuctionCard } from "@/components/discover/AuctionCard";
import { isLiveStatus, type AuctionListing } from "@/lib/data";

type StatusFilter = "all" | "live" | "ended";
type SortKey = "ending" | "bids" | "newest";

function filterListings(
  listings: AuctionListing[],
  status: StatusFilter,
  q: string,
) {
  const needle = q.trim().toLowerCase();
  return listings.filter((a) => {
    if (status === "live" && !isLiveStatus(a.status)) return false;
    if (status === "ended" && a.status !== "ended") return false;
    if (!needle) return true;
    const blob = `${a.title} ${a.shortDescription}`.toLowerCase();
    return blob.includes(needle);
  });
}

function sortListings(listings: AuctionListing[], sort: SortKey) {
  const copy = [...listings];
  switch (sort) {
    case "ending":
      return copy.sort(
        (a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime(),
      );
    case "bids":
      return copy.sort((a, b) => b.bidCount - a.bidCount);
    case "newest":
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    default:
      return copy;
  }
}

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "ended", label: "Ended" },
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "ending", label: "Ending soon" },
  { key: "bids", label: "Most bids" },
  { key: "newest", label: "Newest" },
];

export function DiscoverClient({ listings }: { listings: AuctionListing[] }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("ending");

  const filteredSorted = useMemo(() => {
    const f = filterListings(listings, statusFilter, q);
    return sortListings(f, sort);
  }, [listings, statusFilter, q, sort]);

  return (
    <div className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-cream">
          Discover auctions
        </h1>
        <p className="mt-2 max-w-2xl text-brand-muted">
          Mock listings — browse layout, filters, and detail pages. Bid amounts
          stay hidden until close.
        </p>

        <div className="mt-10 flex flex-col gap-6">
          <label className="block max-w-md">
            <span className="sr-only">Search auctions</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or description…"
              className="w-full rounded-xl border border-brand-muted bg-brand-bg px-4 py-2.5 text-sm text-brand-cream placeholder:text-brand-muted/60 focus:border-brand-lime focus:outline-none focus:ring-1 focus:ring-brand-lime"
            />
          </label>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
              <span className="mr-1 self-center text-xs font-medium uppercase tracking-wide text-brand-muted">
                Status
              </span>
              {statusFilters.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime ${
                    statusFilter === key
                      ? "border-brand-lime bg-brand-lime text-brand-bg"
                      : "border-brand-muted text-brand-cream hover:border-brand-muted/80 hover:bg-brand-cream/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <label htmlFor="discover-sort" className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                Sort by
              </label>
              <select
                id="discover-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="min-h-[2.75rem] min-w-[min(100%,12rem)] cursor-pointer rounded-xl border border-brand-muted bg-brand-bg py-2.5 pl-4 pr-10 text-sm text-brand-cream shadow-sm focus:border-brand-lime focus:outline-none focus:ring-2 focus:ring-brand-lime/40 sm:min-w-[13.5rem] sm:pl-5 sm:pr-11 sm:py-3 sm:text-[0.9375rem]"
              >
                {sortOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredSorted.length === 0 ? (
          <p className="mt-16 text-center text-brand-muted">
            No listings match. Clear search or change filters.
          </p>
        ) : (
          <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSorted.map((listing) => (
              <li key={listing.id}>
                <AuctionCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
