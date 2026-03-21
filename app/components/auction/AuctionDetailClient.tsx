"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatInstantUtc, formatTimeLeft } from "@/lib/format";
import type { AuctionListing } from "@/lib/data";

type Tab = "overview" | "rules" | "activity";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "rules", label: "Rules" },
  { id: "activity", label: "Activity" },
];

export function AuctionDetailClient({ listing }: { listing: AuctionListing }) {
  const [now, setNow] = useState<number | null>(null);
  const [toast, setToast] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const endsMs = new Date(listing.endAt).getTime();
  const startsMs = new Date(listing.startAt).getTime();
  const remainingSec =
    now === null
      ? null
      : Math.max(0, Math.floor((endsMs - now) / 1000));

  const roundOpen =
    listing.status !== "ended" &&
    remainingSec !== null &&
    remainingSec > 0 &&
    now !== null &&
    now >= startsMs;

  const showWinner = listing.status === "ended" && listing.endedWinner;

  const timeLeftLabel =
    listing.status === "ended"
      ? "Ended"
      : formatTimeLeft(remainingSec, false);

  return (
    <div className="space-y-10">
      {/* Metadata strip */}
      <section className="rounded-2xl border border-brand-muted/45 bg-linear-to-br from-brand-cream/6 to-transparent p-6 backdrop-blur-sm sm:p-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
          Auction details
        </h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-brand-muted">Status</dt>
            <dd className="mt-1 font-medium capitalize text-brand-cream">
              {listing.status === "live"
                ? "Live"
                : listing.status === "ending_soon"
                  ? "Ending soon"
                  : "Ended"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-muted">Ends (UTC)</dt>
            <dd className="mt-1 font-mono text-sm text-brand-cream">
              {formatInstantUtc(listing.endAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-muted">Total bids</dt>
            <dd className="mt-1 font-mono text-sm text-brand-lime">
              {listing.bidCount}{" "}
              <span className="text-xs font-sans text-brand-muted">
                (amounts hidden)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-muted">Minimum bid</dt>
            <dd className="mt-1 font-mono text-sm text-brand-cream">
              {listing.minBidSol != null ? `${listing.minBidSol} SOL` : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Encrypted bid */}
      <section className="relative overflow-hidden rounded-2xl border border-brand-lime/25 bg-brand-lime/4 p-6 shadow-[0_0_40px_-20px_rgba(222,241,87,0.35)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-brand-lime/10 blur-3xl" />
        <h2 className="text-lg font-semibold text-brand-cream">Place a bid</h2>
        <p className="mt-2 max-w-2xl text-sm text-brand-muted leading-relaxed">
          Your bid is encrypted and will remain hidden until the auction ends.
          No visible order book — fair price discovery without sniping or floor
          games.
        </p>
        <div className="relative mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm sm:max-w-xs">
            <span className="text-brand-muted">Bid amount (SOL)</span>
            <input
              type="text"
              inputMode="decimal"
              disabled
              placeholder="0.00"
              className="rounded-xl border border-brand-muted bg-brand-bg px-4 py-2.5 font-mono text-sm text-brand-muted"
            />
          </label>
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={!roundOpen}
            onClick={() => setToast(true)}
            className="shrink-0"
          >
            Submit Encrypted Bid
          </Button>
        </div>
        {!roundOpen && listing.status !== "ended" ? (
          <p className="mt-4 text-xs text-brand-muted">
            {now === null
              ? "Loading schedule…"
              : now < startsMs
                ? "Bidding has not started yet (mock times)."
                : remainingSec === 0
                  ? "This round has closed (mock)."
                  : null}
          </p>
        ) : null}
      </section>

      {/* Tabs */}
      <div>
        <div
          className="flex flex-wrap gap-2 border-b border-brand-muted/40 pb-px"
          role="tablist"
          aria-label="Auction sections"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime ${
                tab === t.id
                  ? "text-brand-lime after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-brand-lime"
                  : "text-brand-muted hover:text-brand-cream"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-brand-muted/40 bg-brand-cream/3 p-6 sm:p-8">
          {tab === "overview" ? (
            <div className="space-y-6">
              <p className="text-sm leading-relaxed text-brand-muted">
                Sealed-bid rounds keep all amounts private until the window
                closes. Settlement runs in a trusted environment with a
                verifiable on-chain commitment — no centralized auction house
                required.
              </p>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-brand-muted/35 bg-brand-bg/40 p-4">
                  <dt className="text-xs text-brand-muted">Time remaining</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-brand-lime">
                    {listing.status === "ended"
                      ? "—"
                      : now === null
                        ? "…"
                        : timeLeftLabel}
                  </dd>
                </div>
                <div className="rounded-xl border border-brand-muted/35 bg-brand-bg/40 p-4">
                  <dt className="text-xs text-brand-muted">Sealed bid count</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-brand-cream">
                    {listing.bidCount}
                  </dd>
                </div>
                <div className="rounded-xl border border-brand-muted/35 bg-brand-bg/40 p-4">
                  <dt className="text-xs text-brand-muted">Schedule</dt>
                  <dd className="mt-1 text-xs font-mono leading-relaxed text-brand-cream">
                    {formatInstantUtc(listing.startAt)}
                    <br />
                    <span className="text-brand-muted">→</span>{" "}
                    {formatInstantUtc(listing.endAt)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {tab === "rules" ? (
            <ul className="list-inside list-disc space-y-2 text-sm text-brand-muted marker:text-brand-lime">
              {listing.rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : null}

          {tab === "activity" ? (
            listing.activity.length === 0 ? (
              <p className="text-sm text-brand-muted">
                No public bid feed during a sealed round — only high-level events
                are shown (mock).
              </p>
            ) : (
              <ul className="space-y-4">
                {listing.activity.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 border-b border-brand-muted/25 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm text-brand-cream">{item.label}</span>
                    <time
                      className="font-mono text-xs text-brand-muted"
                      dateTime={item.at}
                    >
                      {formatInstantUtc(item.at)}
                    </time>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      </div>

      {showWinner ? (
        <section className="rounded-2xl border border-brand-lime/30 bg-brand-lime/5 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-brand-lime">Winner reveal</h2>
          <p className="mt-2 text-sm text-brand-muted leading-relaxed">
            Mock outcome — no real settlement. In production, this would match
            attestation + on-chain commitment.
          </p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-brand-muted">
                Winner (mock)
              </dt>
              <dd className="mt-1 font-mono text-brand-cream">
                {listing.endedWinner!.address}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-brand-muted">
                Verifiable commitment
              </dt>
              <dd className="mt-1 font-mono text-brand-cream break-all">
                {listing.endedWinner!.commitment}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-brand-muted">
                Outcome
              </dt>
              <dd className="mt-1 text-brand-muted">
                {listing.endedWinner!.outcome}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-xl border border-brand-muted bg-brand-bg px-4 py-3 text-center text-sm text-brand-cream shadow-lg"
        >
          Demo only — encrypted bids are not submitted on-chain.
          <button
            type="button"
            className="mt-2 block w-full text-xs font-semibold text-brand-lime"
            onClick={() => setToast(false)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
