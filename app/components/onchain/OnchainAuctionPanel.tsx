"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import type { OnchainAuctionSnapshot } from "@/lib/onchainAuction";
import { formatSol } from "@/lib/onchainAuction";
import type { ExplorerCluster } from "@/lib/explorer";
import { solanaExplorerAddressUrl, solanaExplorerTxUrl } from "@/lib/explorer";
import type { AuctionMetadataJson } from "@/lib/programAuctions";
import {
  resolveMetadataImageUrl,
  startingPriceSolFromMetadata,
} from "@/lib/programAuctions";
import { PROGRAM_ID } from "@/lib/config";
import { recoverMetadataUriFromInitTx } from "@/lib/metadataUriFromInitTx";

const PHASES: Record<number, string> = {
  0: "Bidding",
  1: "Reveal",
  2: "Settled",
};

function fmtUtc(sec: number): string {
  const d = new Date(sec * 1000);
  return `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <div className="mt-1 break-all font-mono text-xs text-brand-cream/95">
        {children}
      </div>
    </div>
  );
}

function AddrLink({
  address,
  cluster,
  shorten,
}: {
  address: string;
  cluster: ExplorerCluster;
  shorten?: boolean;
}) {
  const href = solanaExplorerAddressUrl(address, cluster);
  const label =
    shorten && address.length > 12
      ? `${address.slice(0, 4)}…${address.slice(-4)}`
      : address;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-brand-lime underline decoration-brand-lime/40 underline-offset-2 hover:decoration-brand-lime"
    >
      {label}
    </a>
  );
}

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
  const { config, runtime, vaultLamports, pdas } = snapshot;
  const phaseLabel = PHASES[config.phase] ?? `Unknown (${config.phase})`;

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
            <div className="mt-4 space-y-2">
              <p className="text-sm text-amber-200/90">{ipfsErr}</p>
              <a
                href={metaUri}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-brand-lime underline"
              >
                Open metadata JSON
              </a>
            </div>
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
              <a
                href={metaUri}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-brand-lime underline"
              >
                Open metadata JSON
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6 rounded-2xl border border-brand-muted/40 bg-brand-cream/5 p-5 sm:p-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-lime">
          On-chain data
        </h3>
        <p className="mt-1 text-xs text-brand-muted">
          Decoded from the RPC your wallet uses (see header on the live page).
        </p>
      </div>

      {txSignature ? (
        <Field label="Transaction">
          <a
            href={solanaExplorerTxUrl(txSignature, cluster)}
            target="_blank"
            rel="noreferrer"
            className="text-brand-lime underline"
          >
            {txSignature}
          </a>
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Auction ID (u64)">{config.auctionId}</Field>
        <Field label="Phase">{phaseLabel}</Field>
        <Field label="Private mode">{config.privateMode ? "Yes" : "No"}</Field>
        <Field label="TEE winner ready">{config.teeWinnerReady ? "Yes" : "No"}</Field>
        <Field label="Bidding start">{fmtUtc(config.biddingStartSec)}</Field>
        <Field label="Commit end">{fmtUtc(config.commitEndSec)}</Field>
        <Field label="Reveal end">{fmtUtc(config.revealEndSec)}</Field>
        <Field label="Commit / reveal counts">
          {config.commitCount} / {config.revealCount}
        </Field>
        <Field label="Leader bid (lamports)">{config.leaderBid}</Field>
        <Field label="Winning price (lamports)">{config.winningPrice}</Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seller">
          <AddrLink address={config.seller} cluster={cluster} shorten />
        </Field>
        <Field label="Winner (pubkey)">
          <AddrLink address={config.winner} cluster={cluster} shorten />
        </Field>
        <Field label="Leader bidder">
          <AddrLink address={config.leaderBidder} cluster={cluster} shorten />
        </Field>
      </div>

      <Field label="Result hash (hex)">
        <span className="break-all text-[0.7rem] leading-relaxed text-brand-muted">
          {config.resultHashHex}
        </span>
      </Field>

      <div>
        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-brand-muted">
          PDAs
        </p>
        <ul className="mt-2 space-y-2 text-xs">
          <li>
            <span className="text-brand-muted">auction · </span>
            <AddrLink address={pdas.auction} cluster={cluster} />
          </li>
          <li>
            <span className="text-brand-muted">runtime · </span>
            <AddrLink address={pdas.runtime} cluster={cluster} />
          </li>
          <li>
            <span className="text-brand-muted">vault · </span>
            <AddrLink address={pdas.vault} cluster={cluster} />
          </li>
        </ul>
      </div>

      <Field label="Vault balance (native)">
        {formatSol(vaultLamports)} ({vaultLamports.toLocaleString()} lamports)
      </Field>

      {runtime ? (
        <div className="rounded-xl border border-brand-lime/20 bg-brand-bg/40 px-4 py-3">
          <p className="text-xs font-semibold text-brand-lime">AuctionRuntime</p>
          <p className="mt-2 break-all font-mono text-[0.7rem] text-brand-muted">
            commit {runtime.commitCount} · reveal {runtime.revealCount} · leader
            lamports {runtime.leaderBid}
          </p>
          <p className="mt-1 font-mono text-[0.7rem] text-brand-muted">
            leader bidder{" "}
            <AddrLink address={runtime.leaderBidder} cluster={cluster} shorten />
          </p>
        </div>
      ) : (
        <p className="text-xs text-brand-muted">
          No <code className="text-brand-cream/80">auctionRuntime</code> account
          decoded (may be empty if not created yet).
        </p>
      )}
      </div>
    </div>
  );
}
