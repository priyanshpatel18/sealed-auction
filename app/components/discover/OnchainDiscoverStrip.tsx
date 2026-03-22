"use client";

import Link from "next/link";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { useEffect, useMemo, useState } from "react";
import {
  explorerClusterFromRpc,
  solanaExplorerAddressUrl,
  solanaExplorerTxUrl,
} from "@/lib/explorer";
import { BASE_ENDPOINT, PROGRAM_ID } from "@/lib/config";
import { recoverMetadataUriFromInitTx } from "@/lib/metadataUriFromInitTx";
import {
  loadOnchainAuctionSnapshot,
  type LoadOnchainAuctionFailure,
  type OnchainAuctionSnapshot,
} from "@/lib/onchainAuction";
import {
  loadRememberedAuctions,
  type StoredOnchainAuction,
} from "@/lib/onchainListingStorage";
import type { AuctionMetadataJson } from "@/lib/programAuctions";
import {
  resolveMetadataImageUrl,
  startingPriceSolFromMetadata,
} from "@/lib/programAuctions";
import { rpcUrlsEquivalent } from "@/lib/rpc";

function formatAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function failureUserMessage(
  f: LoadOnchainAuctionFailure,
  item: StoredOnchainAuction
): string {
  const storedRpc = item.rpcEndpointAtCreate?.trim();
  const rpcNote = storedRpc
    ? `When you created this listing, the app used RPC: ${storedRpc}. Now NEXT_PUBLIC_BASE_RPC is: ${BASE_ENDPOINT}.`
    : `This app loads accounts from NEXT_PUBLIC_BASE_RPC: ${BASE_ENDPOINT}.`;

  switch (f.reason) {
    case "no_account":
      return `${rpcNote} There is no program account at the expected address on that RPC — usually the transaction landed on a different cluster than the app is pointing at, or the auction id does not match what was initialized. Your tx can still show as success on an explorer for devnet while the app reads mainnet (or localhost), or the reverse.`;
    case "wrong_owner":
      return `Something exists at the auction PDA but it is owned by ${f.actualOwner.slice(0, 12)}… instead of this app’s program (${f.expectedProgram.slice(0, 12)}…). Wrong deployment or corrupted address.`;
    case "decode_failed":
      return `The account exists but the bytes do not decode with the bundled IDL: ${f.message}. Run IDL sync / redeploy so layout matches.`;
    default:
      return "Could not load this auction.";
  }
}

function RememberedAuctionRow({ item }: { item: StoredOnchainAuction }) {
  const readConnection = useMemo(
    () =>
      new Connection(BASE_ENDPOINT, {
        commitment: "confirmed",
      }),
    []
  );
  const cluster = useMemo(
    () => explorerClusterFromRpc(BASE_ENDPOINT),
    []
  );

  const rpcMismatchFromStored =
    item.rpcEndpointAtCreate?.trim() &&
    !rpcUrlsEquivalent(item.rpcEndpointAtCreate, BASE_ENDPOINT);

  const auctionIdBn = useMemo(() => {
    try {
      return new BN(item.auctionId.replace(/\D/g, "") || "0", 10);
    } catch {
      return new BN(0);
    }
  }, [item.auctionId]);

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<OnchainAuctionSnapshot | null>(null);
  const [loadFailure, setLoadFailure] =
    useState<LoadOnchainAuctionFailure | null>(null);
  const [meta, setMeta] = useState<AuctionMetadataJson | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSnapshot(null);
    setLoadFailure(null);
    setMeta(null);
    setMetaErr(null);

    if (auctionIdBn.lte(new BN(0))) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const result = await loadOnchainAuctionSnapshot(
          readConnection,
          auctionIdBn
        );
        if (cancelled) return;
        if (!result.ok) {
          setLoadFailure(result.failure);
          setLoading(false);
          return;
        }
        setSnapshot(result.snapshot);
        let uri = result.snapshot.config.metadataUri?.trim() ?? "";
        if (!uri) {
          uri =
            (await recoverMetadataUriFromInitTx(
              readConnection,
              PROGRAM_ID,
              new PublicKey(result.snapshot.pdas.auction),
              auctionIdBn
            )) ?? "";
        }
        if (!uri) {
          setLoading(false);
          return;
        }
        const r = await fetch(
          `/api/metadata-proxy?url=${encodeURIComponent(uri)}`
        );
        if (cancelled) return;
        if (!r.ok) {
          setMetaErr(`Metadata ${r.status}`);
          setLoading(false);
          return;
        }
        try {
          const j = (await r.json()) as AuctionMetadataJson;
          if (!cancelled) setMeta(j);
        } catch {
          if (!cancelled) setMetaErr("Invalid metadata JSON");
        }
      } catch (e) {
        if (!cancelled) {
          setMetaErr(e instanceof Error ? e.message : "Load failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [readConnection, auctionIdBn]);

  const title =
    (meta?.title || meta?.name)?.trim() ||
    (snapshot ? `Auction ${item.auctionId}` : null);
  const desc = (meta?.description ?? "").trim();
  const uri = snapshot?.config.metadataUri?.trim() ?? "";
  const imageUrl = meta?.image
    ? resolveMetadataImageUrl(meta.image, uri)
    : null;
  const startPx = startingPriceSolFromMetadata(meta);

  const pdaExplorer = loadFailure
    ? solanaExplorerAddressUrl(loadFailure.auctionPda, cluster)
    : null;

  return (
    <li className="rounded-xl border border-brand-muted/35 bg-brand-bg/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-brand-bg/80 sm:h-auto sm:w-32">
          {loading ? (
            <div className="flex h-full min-h-24 items-center justify-center text-xs text-brand-muted">
              Loading…
            </div>
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full min-h-24 items-center justify-center px-2 text-center text-[0.65rem] text-brand-muted">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs text-brand-muted">
              ID{" "}
              <span className="font-mono text-brand-cream/90">{item.auctionId}</span>
              <span className="mx-2 text-brand-muted/40">·</span>
              {formatAgo(item.at)}
            </p>
          </div>
          {rpcMismatchFromStored ? (
            <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
              Create-time RPC differs from current{" "}
              <code className="text-brand-cream/80">NEXT_PUBLIC_BASE_RPC</code>.
              Reads use the current app RPC only.
            </p>
          ) : null}
          {!loading && loadFailure ? (
            <div className="mt-2 space-y-2 text-sm text-amber-200/90">
              <p>{failureUserMessage(loadFailure, item)}</p>
              {pdaExplorer ? (
                <a
                  href={pdaExplorer}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block font-mono text-xs text-brand-lime underline"
                >
                  View expected auction PDA on explorer
                </a>
              ) : null}
            </div>
          ) : null}
          {metaErr && snapshot ? (
            <p className="mt-2 text-xs text-amber-200/85">{metaErr}</p>
          ) : null}
          {title ? (
            <h3 className="mt-1 font-semibold text-brand-cream">{title}</h3>
          ) : loading ? null : (
            <h3 className="mt-1 font-semibold text-brand-cream">
              Auction {item.auctionId}
            </h3>
          )}
          {desc ? (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-brand-muted">
              {desc}
            </p>
          ) : null}
          {startPx ? (
            <p className="mt-2 text-xs font-medium text-brand-lime">
              Starting at {startPx} SOL
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <Link
              href={`/auction/live/${item.auctionId}`}
              className="font-medium text-brand-lime underline underline-offset-4 hover:text-brand-cream"
            >
              Open live view
            </Link>
            <a
              href={solanaExplorerTxUrl(item.tx, cluster)}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-muted underline underline-offset-4 hover:text-brand-cream"
            >
              Transaction
            </a>
          </div>
        </div>
      </div>
    </li>
  );
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
        IDs are stored in this browser. Account + metadata are loaded using{" "}
        <code className="text-[0.65rem] text-brand-cream/80">NEXT_PUBLIC_BASE_RPC</code>
        : <span className="break-all font-mono text-[0.65rem]">{BASE_ENDPOINT}</span>
      </p>
      <ul className="mt-4 space-y-4">
        {items.map((e) => (
          <RememberedAuctionRow key={`${e.auctionId}-${e.tx}`} item={e} />
        ))}
      </ul>
    </section>
  );
}
