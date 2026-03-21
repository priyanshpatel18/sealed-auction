"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { SealedAuctionProgram } from "../../../target/types/sealed_auction_program";
import { ConnectionMagicRouter } from "@magicblock-labs/ephemeral-rollups-sdk";
import BN from "bn.js";
import Link from "next/link";
import {
  BASE_ENDPOINT,
  EPHEMERAL_ENDPOINT,
  EPHEMERAL_WS_ENDPOINT,
  ROUTER_ENDPOINT,
  ROUTER_WS_ENDPOINT,
  PLAYER_STORAGE_KEY,
} from "@/lib/config";
import { programFor } from "@/lib/program";
import { auctionPda, runtimePda } from "@/lib/pdas";
import {
  ensureFunds,
  fetchAndCacheBlockhash,
  walletAdapterFrom,
} from "@/lib/solana";
import type { CachedBlockhash } from "@/lib/types";

const PHASE: Record<number, string> = {
  0: "Bidding",
  1: "Reveal",
  2: "Settled",
};

export default function PublicAuctionPage() {
  const [auctionIdStr, setAuctionIdStr] = useState("1");
  const [status, setStatus] = useState<string>("idle");
  const [delegated, setDelegated] = useState(false);
  const [ephemeralFqdn, setEphemeralFqdn] = useState<string | null>(null);
  const [auctionView, setAuctionView] = useState<{
    phase: number;
    commitCount: number;
    revealCount: number;
    leaderBid: string;
    leaderBidder: string;
    winner: string;
    winningPrice: string;
  } | null>(null);
  const [runtimeView, setRuntimeView] = useState<{
    commitCount: number;
    revealCount: number;
    leaderBid: string;
    leaderBidder: string;
  } | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const keypairRef = useRef<import("@solana/web3.js").Keypair | null>(null);
  const baseConnRef = useRef<Connection | null>(null);
  const erConnRef = useRef<Connection | null>(null);
  const routerRef = useRef<ConnectionMagicRouter | null>(null);
  const programRef = useRef<Program<SealedAuctionProgram> | null>(null);
  const erProgramRef = useRef<Program<SealedAuctionProgram> | null>(null);
  const subIdRef = useRef<number | null>(null);
  const blockhashRef = useRef<CachedBlockhash | null>(null);

  const auctionIdBn = (() => {
    try {
      return new BN(auctionIdStr, 10);
    } catch {
      return new BN(1);
    }
  })();

  const refreshBaseAuction = useCallback(async () => {
    if (!programRef.current) return;
    const ap = auctionPda(auctionIdBn);
    try {
      const acct = await programRef.current.account.auctionConfig.fetch(ap);
      setAuctionView({
        phase: acct.phase,
        commitCount: acct.commitCount,
        revealCount: acct.revealCount,
        leaderBid: acct.leaderBid.toString(),
        leaderBidder: acct.leaderBidder.toBase58(),
        winner: acct.winner.toBase58(),
        winningPrice: acct.winningPrice.toString(),
      });
    } catch {
      setAuctionView(null);
    }
  }, [auctionIdBn]);

  const wireConnections = useCallback(async () => {
    setStatus("connecting…");
    const { Keypair } = await import("@solana/web3.js");
    if (!keypairRef.current) {
      const mod = await import("@/lib/solana");
      keypairRef.current = mod.loadOrCreateKeypair(PLAYER_STORAGE_KEY);
    }
    const kp = keypairRef.current!;
    const wallet = walletAdapterFrom(kp);

    const base = new Connection(BASE_ENDPOINT, "confirmed");
    baseConnRef.current = base;
    await ensureFunds(base, kp);
    await fetchAndCacheBlockhash(base, blockhashRef);

    const er = new Connection(EPHEMERAL_ENDPOINT, {
      wsEndpoint: EPHEMERAL_WS_ENDPOINT,
      commitment: "processed",
    });
    erConnRef.current = er;
    await fetchAndCacheBlockhash(er, blockhashRef);

    programRef.current = programFor(base, wallet);
    erProgramRef.current = programFor(er, wallet);

    const router = new ConnectionMagicRouter(ROUTER_ENDPOINT, {
      wsEndpoint: ROUTER_WS_ENDPOINT,
    });
    routerRef.current = router;

    setStatus("ready");
    await refreshBaseAuction();
  }, [refreshBaseAuction]);

  const refreshDelegation = useCallback(async () => {
    const router = routerRef.current;
    const rt = runtimePda(auctionIdBn);
    if (!router) return;
    try {
      const st = await router.getDelegationStatus(rt);
      setDelegated(st.isDelegated);
      const fq = (st as { fqdn?: string }).fqdn;
      if (st.isDelegated && fq) {
        setEphemeralFqdn(fq);
        const ws = fq.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
        const nextEr = new Connection(fq, { wsEndpoint: ws, commitment: "processed" });
        erConnRef.current = nextEr;
        if (keypairRef.current && erProgramRef.current) {
          const wallet = walletAdapterFrom(keypairRef.current);
          erProgramRef.current = programFor(nextEr, wallet);
        }
        if (subIdRef.current !== null && erConnRef.current) {
          await erConnRef.current
            .removeAccountChangeListener(subIdRef.current)
            .catch(() => undefined);
          subIdRef.current = null;
        }
      }
    } catch (e) {
      console.warn("delegation poll", e);
    }
  }, [auctionIdBn]);

  const subscribeRuntime = useCallback(async () => {
    const erProg = erProgramRef.current;
    const conn = erConnRef.current;
    if (!erProg || !conn) return;
    const rt = runtimePda(auctionIdBn);
    if (subIdRef.current !== null) {
      await conn.removeAccountChangeListener(subIdRef.current).catch(() => undefined);
    }
    subIdRef.current = conn.onAccountChange(
      rt,
      (info) => {
        if (!info?.data) return;
        try {
          const dec = erProg.coder.accounts.decode(
            "auctionRuntime",
            info.data
          ) as {
            commitCount: anchor.BN;
            revealCount: anchor.BN;
            leaderBid: anchor.BN;
            leaderBidder: PublicKey;
          };
          setRuntimeView({
            commitCount: dec.commitCount.toNumber(),
            revealCount: dec.revealCount.toNumber(),
            leaderBid: dec.leaderBid.toString(),
            leaderBidder: dec.leaderBidder.toBase58(),
          });
        } catch (err) {
          console.error("decode runtime", err);
        }
      },
      { commitment: "processed" }
    );
  }, [auctionIdBn]);

  useEffect(() => {
    wireConnections().catch(console.error);
  }, [wireConnections]);

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    refreshBaseAuction().catch(console.error);
    const id = setInterval(() => refreshBaseAuction(), 4000);
    return () => clearInterval(id);
  }, [refreshBaseAuction]);

  useEffect(() => {
    subscribeRuntime().catch(console.error);
    return () => {
      const c = erConnRef.current;
      const sid = subIdRef.current;
      if (c && sid !== null) {
        c.removeAccountChangeListener(sid).catch(() => undefined);
      }
    };
  }, [subscribeRuntime]);

  useEffect(() => {
    refreshDelegation().catch(console.error);
    const id = setInterval(() => refreshDelegation(), 5000);
    return () => clearInterval(id);
  }, [refreshDelegation]);

  const onDelegate = async () => {
    const prog = programRef.current;
    const kp = keypairRef.current;
    const conn = baseConnRef.current;
    if (!prog || !kp || !conn) return;
    setStatus("delegating…");
    try {
      await prog.methods
        .delegateRuntime(auctionIdBn)
        .accounts({
          payer: kp.publicKey,
        })
        .rpc({ skipPreflight: true });
      await refreshDelegation();
      await subscribeRuntime();
      setStatus("delegated");
    } catch (e) {
      console.error(e);
      setStatus(`delegate error: ${(e as Error).message}`);
    }
  };

  return (
    <main className="space-y-8">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Public auction — ER realtime</h1>
        <Link href="/" className="text-emerald-400 text-sm hover:underline">
          Home
        </Link>
      </div>

      <section className="space-y-2 rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
        <label className="block text-sm text-zinc-400">Auction id (u64)</label>
        <input
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 font-mono text-sm"
          value={auctionIdStr}
          onChange={(e) => setAuctionIdStr(e.target.value.replace(/\D/g, "") || "0")}
        />
        <p className="text-xs text-zinc-500">
          Base RPC: {BASE_ENDPOINT} · ER: {EPHEMERAL_ENDPOINT}
          {ephemeralFqdn ? ` · active FQDN: ${ephemeralFqdn}` : ""}
        </p>
        <p className="text-xs text-zinc-500">Status: {status}</p>
        <button
          type="button"
          onClick={() => refreshBaseAuction()}
          className="text-sm px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
        >
          Refresh auction (base)
        </button>
        <button
          type="button"
          onClick={onDelegate}
          className="ml-2 text-sm px-3 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800/80"
        >
          Delegate runtime (base tx)
        </button>
        <p className="text-xs text-zinc-500">
          Delegated (router): {delegated ? "yes" : "no"}
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-800 p-4 space-y-2">
          <h2 className="font-medium text-zinc-200">AuctionConfig (base)</h2>
          {auctionView ? (
            <ul className="text-sm font-mono space-y-1 text-zinc-300">
              <li>phase: {PHASE[auctionView.phase] ?? auctionView.phase}</li>
              <li>commits: {auctionView.commitCount}</li>
              <li>reveals: {auctionView.revealCount}</li>
              <li>leader bid: {auctionView.leaderBid}</li>
              <li>leader bidder: {auctionView.leaderBidder}</li>
              <li>winner: {auctionView.winner}</li>
              <li>winning price: {auctionView.winningPrice}</li>
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No account (wrong id or not initialized).</p>
          )}
        </div>
        <div className="rounded-lg border border-zinc-800 p-4 space-y-2">
          <h2 className="font-medium text-zinc-200">
            AuctionRuntime (WebSocket / ER)
          </h2>
          {runtimeView ? (
            <ul className="text-sm font-mono space-y-1 text-zinc-300">
              <li>commits: {runtimeView.commitCount}</li>
              <li>reveals: {runtimeView.revealCount}</li>
              <li>current leader bid: {runtimeView.leaderBid}</li>
              <li>current leader: {runtimeView.leaderBidder}</li>
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">
              Waiting for WS updates… (during reveal, leader mirrors on-chain).
            </p>
          )}
        </div>
      </section>

      <p className="text-xs text-zinc-600">
        Clock (local): {now}s — use env{" "}
        <code className="text-zinc-400">NEXT_PUBLIC_BASE_RPC</code> /{" "}
        <code className="text-zinc-400">NEXT_PUBLIC_EPHEMERAL_RPC</code> for your
        cluster.
      </p>
    </main>
  );
}
