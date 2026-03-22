"use client";

import type { ReactNode } from "react";
import type { OnchainAuctionSnapshot } from "@/lib/onchainAuction";
import { formatSol } from "@/lib/onchainAuction";
import type { ExplorerCluster } from "@/lib/explorer";
import { solanaExplorerAddressUrl, solanaExplorerTxUrl } from "@/lib/explorer";

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
}: {
  snapshot: OnchainAuctionSnapshot;
  cluster: ExplorerCluster;
  txSignature?: string | null;
}) {
  const { config, runtime, vaultLamports, pdas } = snapshot;
  const phaseLabel = PHASES[config.phase] ?? `Unknown (${config.phase})`;

  return (
    <div className="space-y-6 rounded-2xl border border-brand-muted/40 bg-brand-cream/5 p-5 sm:p-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-lime">
          On-chain data
        </h3>
        <p className="mt-1 text-xs text-brand-muted">
          Decoded from <code className="text-brand-cream/80">NEXT_PUBLIC_BASE_RPC</code>
          .
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

      {config.metadataUri ? (
        <Field label="Metadata (IPFS)">
          <a
            href={config.metadataUri}
            target="_blank"
            rel="noreferrer"
            className="text-brand-lime underline"
          >
            {config.metadataUri}
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
  );
}
