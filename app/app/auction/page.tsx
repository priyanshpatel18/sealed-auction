"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { ConnectionMagicRouter } from "@magicblock-labs/ephemeral-rollups-sdk";
import BN from "bn.js";
import Link from "next/link";
import { anchorWalletFromAdapter } from "@/lib/anchorWallet";
import {
  BASE_ENDPOINT,
  EPHEMERAL_ENDPOINT,
  EPHEMERAL_WS_ENDPOINT,
  ROUTER_ENDPOINT,
  ROUTER_WS_ENDPOINT,
} from "@/lib/config";
import { fetchAuctionConfigAccount } from "@/lib/auctionConfigDecode";
import { hashCommitment } from "@/lib/crypto";
import { programFor } from "@/lib/program";
import { auctionPda, bidPda, runtimePda, vaultPda } from "@/lib/pdas";
import { ensureWalletFunds, fetchAndCacheBlockhash } from "@/lib/solana";
import {
  loadCommitSecrets,
  storeCommitSecrets,
} from "@/lib/commitmentStorage";
import type { CachedBlockhash } from "@/lib/types";
import { friendlyTxError } from "@/lib/walletErrors";
import type { SealedAuctionProgram } from "@/types/sealed_auction_program";

const PHASE: Record<number, string> = {
  0: "Bidding",
  1: "Reveal",
  2: "Settled",
};

const field =
  "w-full rounded-xl border border-brand-muted/50 bg-brand-bg/90 px-4 py-3 font-mono text-sm text-brand-cream placeholder:text-brand-muted/45 focus:border-brand-lime focus:outline-none focus:ring-1 focus:ring-brand-lime";
const label = "mb-1.5 block text-xs font-medium text-brand-muted";
const card =
  "rounded-2xl border border-brand-muted/40 bg-linear-to-br from-brand-cream/6 to-transparent p-6 sm:p-8";
const btnPrimary =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand-lime px-6 text-sm font-semibold text-brand-bg transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg disabled:pointer-events-none disabled:opacity-35";
const btnGhost =
  "inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-muted/70 bg-brand-cream/5 px-5 text-sm font-medium text-brand-cream transition hover:border-brand-lime/50 hover:bg-brand-lime/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg disabled:opacity-35";

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative pl-0 sm:pl-4">
      <div className="flex gap-4">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-lime/35 bg-brand-lime/10 text-sm font-bold text-brand-lime"
          aria-hidden
        >
          {n}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-brand-cream">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function PublicAuctionPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;

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
  /** Avoid Date.now() in useState initializers — server vs client clocks differ and break hydration. */
  const [now, setNow] = useState(0);
  const [txNote, setTxNote] = useState<string | null>(null);

  const [biddingStartStr, setBiddingStartStr] = useState("");
  const [commitEndStr, setCommitEndStr] = useState("");
  const [revealEndStr, setRevealEndStr] = useState("");

  const [commitLamportsStr, setCommitLamportsStr] = useState("1000000000");
  const [revealAmountStr, setRevealAmountStr] = useState("");
  const [revealSaltHex, setRevealSaltHex] = useState("");
  const [settleBiddersStr, setSettleBiddersStr] = useState("");

  const erConnRef = useRef<Connection | null>(null);
  const routerRef = useRef<ConnectionMagicRouter | null>(null);
  const erProgramRef = useRef<Program<SealedAuctionProgram> | null>(null);
  const subIdRef = useRef<number | null>(null);
  const blockhashRef = useRef<CachedBlockhash | null>(null);

  const auctionIdBn = useMemo(() => {
    try {
      return new BN(auctionIdStr, 10);
    } catch {
      return new BN(1);
    }
  }, [auctionIdStr]);

  const program = useMemo(() => {
    const w = anchorWalletFromAdapter(wallet);
    if (!w) return null;
    return programFor(connection, w);
  }, [connection, wallet, connected, publicKey]);

  const refreshBaseAuction = useCallback(async () => {
    if (!program) return;
    const ap = auctionPda(auctionIdBn);
    const acct = await fetchAuctionConfigAccount(connection, program, ap);
    if (!acct) {
      setAuctionView(null);
      return;
    }
    setAuctionView({
      phase: acct.phase,
      commitCount: acct.commitCount,
      revealCount: acct.revealCount,
      leaderBid: acct.leaderBid.toString(),
      leaderBidder: acct.leaderBidder.toBase58(),
      winner: acct.winner.toBase58(),
      winningPrice: acct.winningPrice.toString(),
    });
  }, [program, auctionIdBn, connection]);

  const wireEphemeral = useCallback(async () => {
    const w = anchorWalletFromAdapter(wallet);
    if (!w) return;

    const er = new Connection(EPHEMERAL_ENDPOINT, {
      wsEndpoint: EPHEMERAL_WS_ENDPOINT,
      commitment: "processed",
    });
    erConnRef.current = er;
    await fetchAndCacheBlockhash(er, blockhashRef);
    erProgramRef.current = programFor(er, w);

    const router = new ConnectionMagicRouter(ROUTER_ENDPOINT, {
      wsEndpoint: ROUTER_WS_ENDPOINT,
    });
    routerRef.current = router;
  }, [wallet]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setStatus("connect wallet");
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus("connecting…");
      try {
        await ensureWalletFunds(connection, publicKey);
        await fetchAndCacheBlockhash(connection, blockhashRef);
        await wireEphemeral();
        if (!cancelled) {
          setStatus("ready");
          await refreshBaseAuction();
        }
      } catch (e) {
        if (!cancelled) {
          setStatus(`error: ${await friendlyTxError(e, connection)}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, connection, refreshBaseAuction, wireEphemeral]);

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
        const ws = fq
          .replace(/^https:\/\//, "wss://")
          .replace(/^http:\/\//, "ws://");
        const nextEr = new Connection(fq, {
          wsEndpoint: ws,
          commitment: "processed",
        });
        erConnRef.current = nextEr;
        const w = anchorWalletFromAdapter(wallet);
        if (w) {
          erProgramRef.current = programFor(nextEr, w);
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
  }, [auctionIdBn, wallet]);

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
    const tUnix = Math.floor(Date.now() / 1000);
    setBiddingStartStr(String(tUnix - 2));
    setCommitEndStr(String(tUnix + 120));
    setRevealEndStr(String(tUnix + 360));
  }, []);

  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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
    if (!program || !publicKey) return;
    setStatus("delegating…");
    setTxNote(null);
    try {
      await program.methods
        .delegateRuntime(auctionIdBn)
        .accounts({
          payer: publicKey,
        })
        .rpc({ skipPreflight: true });
      await refreshDelegation();
      await subscribeRuntime();
      setStatus("delegated");
    } catch (e) {
      console.error(e);
      setStatus("ready");
      setTxNote(await friendlyTxError(e, connection));
    }
  };

  const onInitializeAuction = async () => {
    if (!program || !publicKey) return;
    setTxNote(null);
    const auction = auctionPda(auctionIdBn);
    const runtime = runtimePda(auctionIdBn);
    const vault = vaultPda(auctionIdBn);
    try {
      await program.methods
        .initializeAuction(
          auctionIdBn,
          new BN(biddingStartStr, 10),
          new BN(commitEndStr, 10),
          new BN(revealEndStr, 10),
          false,
          ""
        )
        .accounts({
          seller: publicKey,
          auction,
          runtime,
          vault,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc();
      setTxNote("Auction created.");
      await refreshBaseAuction();
    } catch (e) {
      setTxNote(await friendlyTxError(e, connection));
    }
  };

  const onCommitBid = async () => {
    if (!program || !publicKey) return;
    setTxNote(null);
    let amount: BN;
    try {
      amount = new BN(commitLamportsStr.trim(), 10);
    } catch {
      setTxNote("Enter a valid bid amount (lamports).");
      return;
    }
    const salt = Buffer.alloc(32);
    crypto.getRandomValues(salt);
    const comm = Array.from(
      hashCommitment(auctionIdBn, publicKey, amount, salt)
    ) as number[];
    const auction = auctionPda(auctionIdBn);
    const bid = bidPda(auctionIdBn, publicKey);
    const runtime = runtimePda(auctionIdBn);
    try {
      await program.methods
        .commitBid(auctionIdBn, comm)
        .accounts({
          bidder: publicKey,
          auction,
          bid,
          runtime,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc();
      storeCommitSecrets(auctionIdStr, publicKey.toBase58(), salt, amount);
      setTxNote("Bid committed. Secret saved in this browser for reveal.");
      await refreshBaseAuction();
    } catch (e) {
      setTxNote(await friendlyTxError(e, connection));
    }
  };

  const onStartReveal = async () => {
    if (!program || !publicKey) return;
    setTxNote(null);
    try {
      await program.methods
        .startReveal(auctionIdBn)
        .accounts({
          payer: publicKey,
          auction: auctionPda(auctionIdBn),
        } as never)
        .rpc();
      setTxNote("Reveal phase started.");
      await refreshBaseAuction();
    } catch (e) {
      setTxNote(await friendlyTxError(e, connection));
    }
  };

  const onRevealBid = async () => {
    if (!program || !publicKey) return;
    setTxNote(null);
    const stored = loadCommitSecrets(auctionIdStr, publicKey.toBase58());
    let amount: BN;
    let salt: Buffer;
    if (revealAmountStr.trim() && revealSaltHex.trim()) {
      try {
        amount = new BN(revealAmountStr.trim(), 10);
        salt = Buffer.from(revealSaltHex.trim().replace(/^0x/, ""), "hex");
      } catch {
        setTxNote("Check amount and salt (hex).");
        return;
      }
    } else if (stored) {
      amount = stored.amount;
      salt = stored.salt;
    } else {
      setTxNote(
        "Use “Load from this browser” after commit, or enter amount + salt manually."
      );
      return;
    }

    const pre = await fetchAuctionConfigAccount(
      connection,
      program,
      auctionPda(auctionIdBn)
    );
    if (!pre) {
      setTxNote("Could not load auction.");
      return;
    }

    const auction = auctionPda(auctionIdBn);
    const bid = bidPda(auctionIdBn, publicKey);
    const runtime = runtimePda(auctionIdBn);
    const vault = vaultPda(auctionIdBn);

    try {
      await program.methods
        .revealBid(auctionIdBn, amount, salt)
        .accounts({
          bidder: publicKey,
          auction,
          bid,
          runtime,
          vault,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc();
      setTxNote("Bid revealed.");
      await refreshBaseAuction();
    } catch (e) {
      setTxNote(await friendlyTxError(e, connection));
    }
  };

  const onSettleAuction = async () => {
    if (!program || !publicKey) return;
    setTxNote(null);
    const acct = await fetchAuctionConfigAccount(
      connection,
      program,
      auctionPda(auctionIdBn)
    );
    if (!acct) {
      setTxNote("Auction not found.");
      return;
    }
    const vault = vaultPda(auctionIdBn);

    const parts = settleBiddersStr.split(/[\s,]+/).filter(Boolean);
    const remaining: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] =
      [];
    for (const s of parts) {
      let pk: PublicKey;
      try {
        pk = new PublicKey(s);
      } catch {
        setTxNote(`Invalid address: ${s}`);
        return;
      }
      remaining.push(
        { pubkey: bidPda(auctionIdBn, pk), isSigner: false, isWritable: false },
        {
          pubkey: pk,
          isSigner: false,
          isWritable: true,
        }
      );
    }

    try {
      await program.methods
        .settleAuction(auctionIdBn)
        .accounts({
          authority: publicKey,
          auction: auctionPda(auctionIdBn),
          vault,
          seller: acct.seller,
          systemProgram: SystemProgram.programId,
        } as never)
        .remainingAccounts(remaining)
        .rpc();
      setTxNote("Auction settled.");
      await refreshBaseAuction();
    } catch (e) {
      setTxNote(await friendlyTxError(e, connection));
    }
  };

  const fillRevealFromStorage = () => {
    if (!publicKey) return;
    const s = loadCommitSecrets(auctionIdStr, publicKey.toBase58());
    if (!s) {
      setTxNote("No saved bid for this auction in this browser.");
      return;
    }
    setRevealAmountStr(s.amount.toString(10));
    setRevealSaltHex(s.salt.toString("hex"));
    setTxNote("Loaded from your last commit here.");
  };

  const statusBad =
    status.startsWith("error") || /failed to fetch/i.test(status);
  const statusOk = status === "ready" || status === "delegated";

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-lime">
            Trade
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-cream sm:text-4xl">
            Sealed auction
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-muted">
            Create an auction, place a hidden bid, then reveal and settle — all
            on-chain. Connect your wallet in the header first.
          </p>
        </div>
        <Link
          href="/discover"
          className="shrink-0 text-sm font-medium text-brand-muted transition hover:text-brand-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
        >
          ← Discover
        </Link>
      </header>

      {!connected ? (
        <div
          className="mt-10 rounded-2xl border border-brand-muted/50 bg-brand-cream/5 px-5 py-4 text-sm text-brand-cream"
          role="status"
        >
          <p className="font-medium text-brand-lime">Wallet required</p>
          <p className="mt-1 text-brand-muted">
            Use the button in the top bar to connect Phantom, Backpack, or another
            Solana wallet.
          </p>
        </div>
      ) : null}

      <section className={`${card} mt-10 space-y-6`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md flex-1">
            <label className={label} htmlFor="auction-id">
              Auction ID
            </label>
            <input
              id="auction-id"
              className={field}
              inputMode="numeric"
              value={auctionIdStr}
              onChange={(e) =>
                setAuctionIdStr(e.target.value.replace(/\D/g, "") || "0")
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnGhost} onClick={() => refreshBaseAuction()}>
              Refresh status
            </button>
            <button type="button" className={btnGhost} onClick={onDelegate}>
              Delegate ER
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              statusBad
                ? "bg-red-950/50 text-red-200/90"
                : statusOk
                  ? "bg-brand-lime/15 text-brand-lime"
                  : "bg-brand-muted/25 text-brand-muted"
            }`}
          >
            {statusBad ? "Connection issue" : statusOk ? "Connected" : status}
          </span>
          {delegated ? (
            <span className="rounded-full bg-brand-cream/10 px-3 py-1 text-brand-muted">
              ER delegated
            </span>
          ) : null}
        </div>

        {statusBad ? (
          <div className="rounded-xl border border-red-500/30 bg-red-950/25 px-4 py-3 text-sm text-red-100/95">
            <p className="font-medium">Cannot reach the RPC</p>
            <p className="mt-1 text-red-200/80">
              Often this means the URL in{" "}
              <code className="rounded bg-black/30 px-1 font-mono text-xs">
                NEXT_PUBLIC_BASE_RPC
              </code>{" "}
              is wrong, offline, or blocked. Use a URL that matches your wallet
              network (e.g. devnet) and reload.
            </p>
          </div>
        ) : null}

        {txNote ? (
          <p className="max-h-[min(320px,50vh)] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-brand-muted/40 bg-brand-bg/60 px-4 py-3 font-mono text-xs leading-relaxed text-brand-cream/95">
            {txNote}
          </p>
        ) : null}

        <details className="group rounded-xl border border-brand-muted/35 bg-brand-bg/40">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-brand-muted transition hover:text-brand-cream [&::-webkit-details-marker]:hidden">
            <span className="text-brand-lime">▸</span> RPC &amp; network details
          </summary>
          <div className="space-y-2 border-t border-brand-muted/25 px-4 py-3 font-mono text-[11px] leading-relaxed text-brand-muted/90">
            <p>
              <span className="text-brand-muted/70">Base</span> {BASE_ENDPOINT}
            </p>
            <p>
              <span className="text-brand-muted/70">ER</span> {EPHEMERAL_ENDPOINT}
            </p>
            {ephemeralFqdn ? (
              <p>
                <span className="text-brand-muted/70">FQDN</span> {ephemeralFqdn}
              </p>
            ) : null}
            <p className="text-brand-muted/60">
              Clock {now === 0 ? "—" : now} · Set env vars to match your cluster.
            </p>
          </div>
        </details>
      </section>

      <section className="mt-14 space-y-12">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-muted">
            Steps
          </h2>
          <p className="mt-2 max-w-lg text-sm text-brand-muted">
            Go in order. Times are Unix seconds (UTC clock on-chain).
          </p>
        </div>

        <div className="space-y-14">
          <Step n={1} title="Create auction">
            <div className="space-y-4">
              <p className="text-sm text-brand-muted">
                Bids and escrow use native SOL (lamports). No SPL mint address is
                required.
              </p>
              <div className="grid gap-4 sm:grid-cols-1">
                <div>
                  <label className={label} htmlFor="t0">
                    Bidding opens (Unix time)
                  </label>
                  <input
                    id="t0"
                    className={field}
                    value={biddingStartStr}
                    onChange={(e) => setBiddingStartStr(e.target.value)}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="t1">
                    Bidding ends (commit deadline)
                  </label>
                  <input
                    id="t1"
                    className={field}
                    value={commitEndStr}
                    onChange={(e) => setCommitEndStr(e.target.value)}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="t2">
                    Reveal ends
                  </label>
                  <input
                    id="t2"
                    className={field}
                    value={revealEndStr}
                    onChange={(e) => setRevealEndStr(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                className={btnPrimary}
                disabled={!program}
                onClick={onInitializeAuction}
              >
                Create auction
              </button>
            </div>
          </Step>

          <Step n={2} title="Place a sealed bid">
            <div className="space-y-4">
              <div>
                <label className={label} htmlFor="bid-amt">
                  Bid amount
                </label>
                <input
                  id="bid-amt"
                  className={field}
                  value={commitLamportsStr}
                  onChange={(e) => setCommitLamportsStr(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-brand-muted/80">
                  In lamports (1 SOL = 10⁹ lamports). A secret is stored locally for
                  the reveal step.
                </p>
              </div>
              <button
                type="button"
                className={btnPrimary}
                disabled={!program}
                onClick={onCommitBid}
              >
                Submit sealed bid
              </button>
            </div>
          </Step>

          <Step n={3} title="Open reveal phase">
            <p className="text-sm text-brand-muted">
              After bidding closes, move the auction into the reveal phase.
            </p>
            <button
              type="button"
              className={btnPrimary}
              disabled={!program}
              onClick={onStartReveal}
            >
              Start reveal phase
            </button>
          </Step>

          <Step n={4} title="Reveal your bid">
            <p className="text-sm text-brand-muted">
              You need the same wallet with enough SOL to pay your bid into the
              escrow vault. Prefer loading the secret from this browser after you
              committed here.
            </p>
            <button
              type="button"
              className={`${btnGhost} mb-4 w-full sm:w-auto`}
              onClick={fillRevealFromStorage}
            >
              Load from this browser
            </button>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="rev-amt">
                  Amount (lamports)
                </label>
                <input
                  id="rev-amt"
                  className={field}
                  placeholder="Optional if loaded"
                  value={revealAmountStr}
                  onChange={(e) => setRevealAmountStr(e.target.value)}
                />
              </div>
              <div>
                <label className={label} htmlFor="rev-salt">
                  Salt (hex)
                </label>
                <input
                  id="rev-salt"
                  className={field}
                  placeholder="Optional if loaded"
                  value={revealSaltHex}
                  onChange={(e) => setRevealSaltHex(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className={btnPrimary}
              disabled={!program}
              onClick={onRevealBid}
            >
              Reveal bid
            </button>
          </Step>

          <Step n={5} title="Settle">
            <p className="text-sm text-brand-muted">
              After reveal ends, the seller settles. List every bidder who revealed
              (space or comma separated).
            </p>
            <label className={label} htmlFor="settle-bidders">
              Bidder addresses
            </label>
            <textarea
              id="settle-bidders"
              className={`${field} min-h-[100px] resize-y font-mono text-xs leading-relaxed`}
              placeholder="One pubkey per line…"
              value={settleBiddersStr}
              onChange={(e) => setSettleBiddersStr(e.target.value)}
            />
            <button
              type="button"
              className={btnPrimary}
              disabled={!program}
              onClick={onSettleAuction}
            >
              Settle auction
            </button>
          </Step>
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-2">
        <div className={card}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            On-chain auction
          </h3>
          {auctionView ? (
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-brand-muted/20 pb-3">
                <dt className="text-brand-muted">Phase</dt>
                <dd className="font-medium text-brand-cream">
                  {PHASE[auctionView.phase] ?? auctionView.phase}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-brand-muted/20 pb-3">
                <dt className="text-brand-muted">Commits</dt>
                <dd className="font-mono text-brand-cream">{auctionView.commitCount}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-brand-muted/20 pb-3">
                <dt className="text-brand-muted">Reveals</dt>
                <dd className="font-mono text-brand-cream">{auctionView.revealCount}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-brand-muted/20 pb-3">
                <dt className="text-brand-muted">Leading bid</dt>
                <dd className="font-mono text-xs text-brand-cream break-all">
                  {auctionView.leaderBid}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-muted">Winner</dt>
                <dd className="max-w-[60%] truncate font-mono text-xs text-brand-lime">
                  {auctionView.winner}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-brand-muted">
              No data for this ID yet — create an auction or check the ID.
            </p>
          )}
        </div>
        <div className={card}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Live runtime (ER)
          </h3>
          {runtimeView ? (
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-brand-muted/20 pb-3">
                <dt className="text-brand-muted">Commits</dt>
                <dd className="font-mono">{runtimeView.commitCount}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-brand-muted/20 pb-3">
                <dt className="text-brand-muted">Reveals</dt>
                <dd className="font-mono">{runtimeView.revealCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-muted">Leader</dt>
                <dd className="max-w-[70%] truncate font-mono text-xs text-brand-cream">
                  {runtimeView.leaderBidder}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-brand-muted">
              Waiting for updates — delegate ER and subscribe, or check back after
              activity.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
