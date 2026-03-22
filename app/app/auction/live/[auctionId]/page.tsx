"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BN from "bn.js";
import { OnchainAuctionPanel } from "@/components/onchain/OnchainAuctionPanel";
import { BASE_ENDPOINT } from "@/lib/config";
import {
  describeAuctionLoadFailure,
  loadOnchainAuctionSnapshot,
  type OnchainAuctionSnapshot,
} from "@/lib/onchainAuction";
import { explorerClusterFromRpc } from "@/lib/explorer";
import { walletRpcMismatchMessage } from "@/lib/rpc";

export default function LiveAuctionPage() {
  const { connection } = useConnection();
  const params = useParams();
  const rawId = params?.auctionId;
  const auctionIdStr = typeof rawId === "string" ? rawId : "";

  const auctionIdBn = useMemo(() => {
    try {
      return new BN(auctionIdStr.replace(/\D/g, "") || "0", 10);
    } catch {
      return new BN(0);
    }
  }, [auctionIdStr]);

  const activeRpc = connection.rpcEndpoint || BASE_ENDPOINT;
  const cluster = useMemo(
    () => explorerClusterFromRpc(activeRpc),
    [activeRpc]
  );

  const rpcMismatchWarning = useMemo(
    () => walletRpcMismatchMessage(activeRpc, BASE_ENDPOINT),
    [activeRpc]
  );

  const [snapshot, setSnapshot] = useState<OnchainAuctionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!auctionIdStr.trim() || auctionIdBn.lte(new BN(0))) {
      setLoading(false);
      setSnapshot(null);
      setError("Invalid auction id.");
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const result = await loadOnchainAuctionSnapshot(connection, auctionIdBn);
        if (!cancelled) {
          if (result.ok) {
            setSnapshot(result.snapshot);
            setError(null);
          } else {
            setSnapshot(null);
            setError(
              describeAuctionLoadFailure(result.failure, activeRpc)
            );
          }
        }
      } catch (e) {
        if (!cancelled) {
          setSnapshot(null);
          setError(e instanceof Error ? e.message : "Failed to load on-chain data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connection, auctionIdBn, auctionIdStr, activeRpc]);

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/discover"
        className="text-sm font-medium text-brand-muted transition hover:text-brand-lime"
      >
        ← Discover
      </Link>

      <header className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-lime">
          On-chain
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-cream sm:text-4xl">
          Auction {auctionIdStr || "—"}
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          Live read via wallet RPC{" "}
          <span className="break-all font-mono text-xs text-brand-cream/85">
            {activeRpc}
          </span>
        </p>
        <p className="mt-1 text-xs text-brand-muted">
          App default <code className="text-brand-cream/70">NEXT_PUBLIC_BASE_RPC</code>:{" "}
          <span className="break-all font-mono">{BASE_ENDPOINT}</span>
        </p>
      </header>

      <div className="mt-10">
        {loading ? (
          <p className="text-sm text-brand-muted">Loading account data…</p>
        ) : error ? (
          <p className="rounded-xl border border-red-500/25 bg-red-950/25 px-4 py-3 text-sm text-red-100/95">
            {error}
          </p>
        ) : snapshot ? (
          <OnchainAuctionPanel
            snapshot={snapshot}
            cluster={cluster}
            rpcMismatchWarning={rpcMismatchWarning}
          />
        ) : null}
      </div>
    </div>
  );
}
