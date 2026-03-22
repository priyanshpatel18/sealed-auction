"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import type { OnchainAuctionSnapshot } from "@/lib/onchainAuction";
import type { ExplorerCluster } from "@/lib/explorer";
import { solanaExplorerTxUrl } from "@/lib/explorer";
import type { AuctionMetadataJson } from "@/lib/programAuctions";
import {
  resolveMetadataImageUrl,
  startingPriceSolFromMetadata,
} from "@/lib/programAuctions";
import { PROGRAM_ID } from "@/lib/config";
import { recoverMetadataUriFromInitTx } from "@/lib/metadataUriFromInitTx";

export function OnchainAuctionPanel({
  snapshot,
  cluster,
  txSignature,
  rpcMismatchWarning,
}: {
  snapshot: OnchainAuctionSnapshot;
  cluster: ExplorerCluster;
  txSignature?: string | null;
  /** When wallet RPC ≠ app default — short UX note */
  rpcMismatchWarning?: string | null;
}) {
  const { connection } = useConnection();
  const { config, pdas } = snapshot;

  const [ipfsMeta, setIpfsMeta] = useState<AuctionMetadataJson | null>(null);
  const [ipfsLoading, setIpfsLoading] = useState(false);
  const [ipfsErr, setIpfsErr] = useState<string | null>(null);
  const [resolvedMetadataUri, setResolvedMetadataUri] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    setIpfsLoading(true);
    setIpfsErr(null);
    setIpfsMeta(null);
    setResolvedMetadataUri(null);

    (async () => {
      let uri = config.metadataUri?.trim() ?? "";
      if (!uri) {
        try {
          uri =
            (await recoverMetadataUriFromInitTx(
              connection,
              PROGRAM_ID,
              new PublicKey(pdas.auction),
              new BN(config.auctionId, 10)
            )) ?? "";
        } catch {
          uri = "";
        }
      }
      if (cancelled) return;
      setResolvedMetadataUri(uri || null);
      if (!uri) {
        setIpfsLoading(false);
        return;
      }
      try {
        const r = await fetch(
          `/api/metadata-proxy?url=${encodeURIComponent(uri)}`
        );
        if (cancelled) return;
        if (!r.ok) {
          setIpfsErr(`Could not fetch metadata (HTTP ${r.status}).`);
          return;
        }
        const j = (await r.json()) as AuctionMetadataJson;
        if (!cancelled) setIpfsMeta(j);
      } catch (e) {
        if (!cancelled) {
          setIpfsErr(
            e instanceof Error ? e.message : "Failed to load metadata."
          );
        }
      } finally {
        if (!cancelled) setIpfsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connection, config.metadataUri, config.auctionId, pdas.auction]);

  const metaUri = resolvedMetadataUri ?? config.metadataUri?.trim() ?? "";
  const displayTitle =
    (ipfsMeta?.title || ipfsMeta?.name)?.trim() || `Auction ${config.auctionId}`;
  const displayDesc = (ipfsMeta?.description ?? "").trim();
  const coverUrl = ipfsMeta?.image
    ? resolveMetadataImageUrl(ipfsMeta.image, metaUri)
    : null;
  const startPx = startingPriceSolFromMetadata(ipfsMeta);

  return (
    <div className="space-y-6">
      {rpcMismatchWarning ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/95">
          {rpcMismatchWarning}
        </p>
      ) : null}

      {txSignature ? (
        <p className="text-sm text-brand-muted">
          <a
            href={solanaExplorerTxUrl(txSignature, cluster)}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-lime underline decoration-brand-lime/40 underline-offset-2 hover:decoration-brand-lime"
          >
            View transaction on explorer
          </a>
        </p>
      ) : null}

      {metaUri ? (
        <div className="rounded-2xl border border-brand-muted/40 bg-brand-cream/5 p-5 sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-lime">
            Listing (IPFS metadata)
          </h3>
          <p className="mt-1 text-xs text-brand-muted">
            Fetched via <code className="text-brand-cream/80">/api/metadata-proxy</code>
            .
          </p>
          {ipfsLoading ? (
            <p className="mt-4 text-sm text-brand-muted">Loading metadata…</p>
          ) : null}
          {ipfsErr ? (
            <p className="mt-4 text-sm text-amber-200/90">{ipfsErr}</p>
          ) : null}
          {!ipfsLoading && !ipfsErr && ipfsMeta ? (
            <div className="mt-4 space-y-4">
              {coverUrl ? (
                <div className="overflow-hidden rounded-xl border border-brand-muted/40 bg-brand-bg/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt=""
                    className="max-h-64 w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : null}
              <div>
                <p className="text-lg font-semibold text-brand-cream">{displayTitle}</p>
                {displayDesc ? (
                  <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                    {displayDesc}
                  </p>
                ) : null}
                {startPx ? (
                  <p className="mt-3 text-sm font-medium text-brand-lime">
                    Starting at {startPx} SOL
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
