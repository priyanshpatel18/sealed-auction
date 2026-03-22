"use client";

import Link from "next/link";
import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAllProgramAuctionsWithMetadata,
  isAuctionAcceptingCommits,
} from "@/lib/programAuctions";
import type { ProgramAuctionListItem } from "@/lib/programAuctions";
import { formatTimeLeft } from "@/lib/format";
import { StatusBadge } from "@/components/ui/Badge";

function phaseLabel(phase: number): string {
  if (phase === 0) return "Bidding";
  if (phase === 1) return "Reveal";
  if (phase === 2) return "Settled";
  return `Phase ${phase}`;
}

function listingStatus(
  phase: number,
  revealEndSec: number,
  nowMs: number
): "live" | "ending_soon" | "ended" {
  if (phase === 2) return "ended";
  const endMs = revealEndSec * 1000;
  if (nowMs >= endMs) return "ended";
  const leftSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));
  if (leftSec < 86400) return "ending_soon";
  return "live";
}

function shortenPk(pk: string): string {
  if (pk.length <= 12) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

type ListFilter = "live" | "all";

function AuctionProgramCard({ row, nowMs }: { row: ProgramAuctionListItem; nowMs: number }) {
  const status = listingStatus(row.phase, row.revealEndSec, nowMs);
  const nowSec = Math.floor(nowMs / 1000);
  const accepting = isAuctionAcceptingCommits(row, nowSec);
  const remainingSec =
    status === "ended" ? null : Math.max(0, row.revealEndSec - nowSec);
  const timeLabel = formatTimeLeft(remainingSec, status === "ended");
  const commitLeftSec = accepting
    ? Math.max(0, row.commitEndSec - nowSec)
    : null;
  const commitEndsLabel =
    commitLeftSec !== null ? formatTimeLeft(commitLeftSec, false) : null;

  return (
    <Link
      href={`/auction/live/${row.auctionId}`}
      className="auction-card group flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-muted/45 bg-gradient-to-b from-brand-cream/[0.07] to-transparent transition duration-300 hover:-translate-y-1 hover:border-brand-lime/35 hover:shadow-[0_24px_48px_-28px_rgba(222,241,87,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
    >
      <div className="relative shrink-0 bg-brand-bg/80">
        <div className="aspect-[16/10] w-full overflow-hidden">
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- IPFS / gateway URLs vary; avoid remotePatterns churn
            <img
              src={row.imageUrl}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-muted/20 to-brand-bg px-4 text-center text-xs text-brand-muted">
              <span className="text-brand-muted/80">No cover image</span>
              <span className="max-w-[14rem] text-[0.65rem] leading-relaxed text-brand-muted/60">
                Pin metadata with an <code className="text-brand-cream/50">image</code> field
                when creating the auction.
              </span>
            </div>
          )}
        </div>
        <div className="absolute right-3 top-3 z-10 flex flex-wrap justify-end gap-2">
          {accepting ? (
            <span className="rounded-full border border-brand-lime/60 bg-brand-lime/20 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-lime">
              Open for bids
            </span>
          ) : null}
          <StatusBadge status={status} />
        </div>
        <span className="absolute bottom-3 left-3 z-10 rounded-full border border-brand-muted/50 bg-brand-bg/85 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-brand-lime">
          {phaseLabel(row.phase)}
          {row.privateMode ? " · Private" : ""}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <h2 className="line-clamp-2 min-h-[3rem] text-base font-semibold leading-snug text-brand-cream transition group-hover:text-brand-lime">
          {row.title}
        </h2>
        <p className="mt-2 line-clamp-4 min-h-[4.5rem] text-sm leading-relaxed text-brand-muted">
          {row.description.trim() || "No description in metadata."}
        </p>
        <p className="mt-3 text-[0.7rem] text-brand-muted/90">
          <span className="text-brand-muted">Seller </span>
          <span className="font-mono text-brand-cream/80">{shortenPk(row.seller)}</span>
          <span className="mx-1.5 text-brand-muted/50">·</span>
          <span className="text-brand-muted">ID </span>
          <span className="font-mono tabular-nums text-brand-cream/80">{row.auctionId}</span>
        </p>
        {row.startingPriceSol ? (
          <p className="mt-2 text-sm font-medium text-brand-lime">
            Starting at {row.startingPriceSol} SOL
          </p>
        ) : null}
        <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-2 border-t border-brand-muted/30 pt-4 text-xs">
          {accepting && commitEndsLabel ? (
            <div>
              <dt className="text-brand-muted">Commit window ends</dt>
              <dd className="mt-0.5 font-mono tabular-nums text-brand-lime">{commitEndsLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-brand-muted">Until reveal end</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-brand-cream">{timeLabel}</dd>
          </div>
          <div>
            <dt className="text-brand-muted">Commits</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-brand-lime">{row.commitCount}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}

export function ProgramAuctionsGrid() {
  const { connection } = useConnection();
  const [rows, setRows] = useState<ProgramAuctionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [q, setQ] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("live");

  const scopeRows = useMemo(() => {
    if (!rows) return [];
    if (listFilter === "all") return rows;
    const nowSec = Math.floor(nowMs / 1000);
    return rows.filter((r) => isAuctionAcceptingCommits(r, nowSec));
  }, [rows, listFilter, nowMs]);

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return scopeRows;
    return scopeRows.filter((r) => {
      const blob =
        `${r.title} ${r.description} ${r.shortDescription} ${r.auctionId} ${r.seller} ${r.startingPriceSol ?? ""}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [scopeRows, q]);

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const list = await fetchAllProgramAuctionsWithMetadata(connection);
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setError(e instanceof Error ? e.message : "Failed to load auctions");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connection]);

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/25 bg-red-950/20 px-5 py-4 text-sm text-red-100/95">
        <p className="font-medium">Live auctions</p>
        <p className="mt-1 text-xs opacity-90">{error}</p>
      </section>
    );
  }

  if (rows === null) {
    return (
      <section className="rounded-2xl border border-brand-muted/40 bg-brand-cream/5 px-5 py-6">
        <p className="text-sm text-brand-muted">Loading auctions and metadata…</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-brand-muted/40 bg-brand-cream/5 px-5 py-6">
        <h2 className="text-sm font-semibold text-brand-cream">Live auctions</h2>
        <p className="mt-2 text-sm text-brand-muted">
          No <code className="text-xs text-brand-cream/90">AuctionConfig</code> accounts
          found for this program on the current RPC. Create one on this cluster, then refresh.
        </p>
      </section>
    );
  }

  const nowSec = Math.floor(nowMs / 1000);
  const liveCount = rows.filter((r) => isAuctionAcceptingCommits(r, nowSec)).length;

  return (
    <section aria-label="On-chain program auctions">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-brand-cream">Browse auctions</h2>
          <p className="mt-1 text-sm text-brand-muted">
            <span className="text-brand-cream/90">{liveCount}</span> open for bids now ·{" "}
            <span className="text-brand-cream/90">{rows.length}</span> total on-chain — cards use
            title, description, and image from IPFS metadata.
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Listing filter"
        >
          <button
            type="button"
            onClick={() => setListFilter("live")}
            className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
              listFilter === "live"
                ? "border-brand-lime/50 bg-brand-lime/15 text-brand-lime"
                : "border-brand-muted/50 text-brand-muted hover:border-brand-muted hover:text-brand-cream"
            }`}
          >
            Live bidding
          </button>
          <button
            type="button"
            onClick={() => setListFilter("all")}
            className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
              listFilter === "all"
                ? "border-brand-lime/50 bg-brand-lime/15 text-brand-lime"
                : "border-brand-muted/50 text-brand-muted hover:border-brand-muted hover:text-brand-cream"
            }`}
          >
            All auctions
          </button>
        </div>
        <label className="block w-full max-w-sm sm:min-w-[16rem] sm:max-w-xs">
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, description, id…"
            className="w-full rounded-xl border border-brand-muted bg-brand-bg px-4 py-2.5 text-sm text-brand-cream placeholder:text-brand-muted/60 focus:border-brand-lime focus:outline-none focus:ring-1 focus:ring-brand-lime"
          />
        </label>
      </div>
      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-brand-muted/40 bg-brand-cream/5 px-5 py-8 text-center">
          <p className="text-sm text-brand-muted">
            {q.trim()
              ? "No listings match your search."
              : listFilter === "live"
                ? "No auctions are open for bids right now (commit window closed or auction moved past bidding)."
                : "No listings match your search."}
          </p>
          {!q.trim() && listFilter === "live" && rows.length > 0 ? (
            <button
              type="button"
              onClick={() => setListFilter("all")}
              className="mt-4 text-sm font-medium text-brand-lime underline underline-offset-4 hover:text-brand-cream"
            >
              Show all auctions
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRows.map((row) => (
            <li key={row.auctionId} className="h-full min-h-0">
              <AuctionProgramCard row={row} nowMs={nowMs} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
