"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  type Connection,
  type PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import { anchorWalletFromAdapter } from "@/lib/anchorWallet";
import {
  loadCommitSecrets,
  storeCommitSecrets,
} from "@/lib/commitmentStorage";
import { hashCommitment } from "@/lib/crypto";
import type { OnchainAuctionSnapshot } from "@/lib/onchainAuction";
import { programFor, programReadOnly } from "@/lib/program";
import { auctionPda, bidPda, runtimePda, vaultPda } from "@/lib/pdas";
import { friendlyTxError } from "@/lib/walletErrors";

const field =
  "w-full rounded-xl border border-brand-muted/50 bg-brand-bg/90 px-4 py-3 font-mono text-sm text-brand-cream placeholder:text-brand-muted/45 focus:border-brand-lime focus:outline-none focus:ring-1 focus:ring-brand-lime";
const label = "mb-1.5 block text-xs font-medium text-brand-muted";
const btnPrimary =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand-lime px-6 text-sm font-semibold text-brand-bg transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg disabled:pointer-events-none disabled:opacity-35";

/** Parse a decimal SOL string into lamports (max 9 fractional digits). */
function parseSolToLamports(s: string): BN | null {
  const t = s.trim();
  if (!t) return null;
  const neg = t.startsWith("-");
  const rest = neg ? t.slice(1) : t;
  if (!/^\d*\.?\d*$/.test(rest) || rest === ".") return null;
  const [wholeRaw, fracRaw = ""] = rest.split(".");
  const whole = wholeRaw || "0";
  const frac = (fracRaw + "000000000").slice(0, 9);
  try {
    const lamports = new BN(whole, 10)
      .mul(new BN(LAMPORTS_PER_SOL.toString()))
      .add(new BN(frac, 10));
    if (neg && !lamports.isZero()) return null;
    return lamports;
  } catch {
    return null;
  }
}

type BidFetch = { exists: true; revealed: boolean } | { exists: false };

/**
 * Detect bid PDA using RPC account info first so we still block a second `commit_bid`
 * when Anchor decode fails (stale IDL, etc.). `init` fails with "already in use" if
 * any account already occupies the PDA address.
 */
async function loadBidStatus(
  connection: Connection,
  auctionIdBn: BN,
  bidder: PublicKey
): Promise<BidFetch> {
  const bid = bidPda(auctionIdBn, bidder);
  const info = await connection.getAccountInfo(bid, "confirmed");
  if (!info?.data.length) return { exists: false };

  const prog = programReadOnly(connection);
  if (!info.owner.equals(prog.programId)) {
    return { exists: true, revealed: false };
  }

  try {
    const row = await prog.account.bidCommitment.fetch(bid);
    return { exists: true, revealed: row.revealed };
  } catch {
    return { exists: true, revealed: false };
  }
}

export function LiveAuctionBidPanel({
  snapshot,
  auctionIdBn,
  storageAuctionId,
  onAfterTx,
}: {
  snapshot: OnchainAuctionSnapshot;
  auctionIdBn: BN;
  /** Key for sessionStorage (use on-chain auction id string). */
  storageAuctionId: string;
  onAfterTx: () => void | Promise<void>;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;

  const anchorWallet = useMemo(
    () => anchorWalletFromAdapter(wallet),
    [wallet]
  );
  const program = useMemo(
    () => (anchorWallet ? programFor(connection, anchorWallet) : null),
    [connection, anchorWallet]
  );

  const { config } = snapshot;
  const nowSec = Math.floor(Date.now() / 1000);

  const [bidSol, setBidSol] = useState("");
  const [busy, setBusy] = useState<"commit" | "reveal" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [bidOnChain, setBidOnChain] = useState<BidFetch | null>(null);
  const [secretTick, setSecretTick] = useState(0);

  const refreshBidAccount = useCallback(async () => {
    if (!publicKey) {
      setBidOnChain(null);
      return;
    }
    const status = await loadBidStatus(connection, auctionIdBn, publicKey);
    setBidOnChain(status);
  }, [connection, auctionIdBn, publicKey]);

  useEffect(() => {
    refreshBidAccount().catch(console.error);
  }, [refreshBidAccount]);

  const inCommitWindow =
    config.phase === 0 &&
    nowSec >= config.biddingStartSec &&
    nowSec < config.commitEndSec;

  const inRevealWindow =
    config.phase === 1 &&
    nowSec >= config.commitEndSec &&
    nowSec < config.revealEndSec;

  const canTryCommit =
    connected &&
    program &&
    publicKey &&
    !config.privateMode &&
    inCommitWindow &&
    bidOnChain &&
    !bidOnChain.exists;

  const canTryReveal =
    connected &&
    program &&
    publicKey &&
    !config.privateMode &&
    inRevealWindow &&
    bidOnChain?.exists &&
    !bidOnChain.revealed;

  const storedSecrets = useMemo(() => {
    if (!publicKey) return null;
    return loadCommitSecrets(storageAuctionId, publicKey.toBase58());
  }, [storageAuctionId, publicKey, secretTick]);

  const onCommit = async () => {
    if (!program || !publicKey) return;
    setNote(null);
    const lamports = parseSolToLamports(bidSol);
    if (!lamports || lamports.lte(new BN(0))) {
      setNote("Enter a positive bid amount in SOL (e.g. 0.5).");
      return;
    }
    if (lamports.lt(new BN(1))) {
      setNote("Minimum bid is 1 lamport (revealed on-chain).");
      return;
    }

    const statusPre = await loadBidStatus(connection, auctionIdBn, publicKey);
    setBidOnChain(statusPre);
    if (statusPre.exists) {
      setNote(
        "On-chain check: this wallet already has a bid account here (maybe from an earlier commit). You cannot commit twice. Use Reveal in the reveal phase; use this browser if you need the saved salt."
      );
      return;
    }

    setBusy("commit");
    try {
      const salt = Buffer.alloc(32);
      crypto.getRandomValues(salt);
      const comm = Array.from(
        hashCommitment(auctionIdBn, publicKey, lamports, salt)
      ) as number[];

      const auction = auctionPda(auctionIdBn);
      const bid = bidPda(auctionIdBn, publicKey);
      const runtime = runtimePda(auctionIdBn);

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

      storeCommitSecrets(storageAuctionId, publicKey.toBase58(), salt, lamports);
      setSecretTick((t) => t + 1);
      setNote(
        "Sealed bid committed. Your wallet will pay this amount when you reveal after bidding closes."
      );
      await refreshBidAccount();
      await onAfterTx();
    } catch (e) {
      setNote(await friendlyTxError(e, connection));
      await refreshBidAccount();
    } finally {
      setBusy(null);
    }
  };

  const onReveal = async () => {
    if (!program || !publicKey) return;
    setNote(null);
    const stored = loadCommitSecrets(storageAuctionId, publicKey.toBase58());
    if (!stored) {
      setNote(
        "No saved secret for this auction in this browser. Use the same device where you committed, or reveal manually with the exact amount and salt from your commit."
      );
      return;
    }

    setBusy("reveal");
    try {
      const auction = auctionPda(auctionIdBn);
      const bid = bidPda(auctionIdBn, publicKey);
      const runtime = runtimePda(auctionIdBn);
      const vault = vaultPda(auctionIdBn);

      await program.methods
        .revealBid(auctionIdBn, stored.amount, stored.salt)
        .accounts({
          bidder: publicKey,
          auction,
          bid,
          runtime,
          vault,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc();

      setNote("Bid revealed; SOL moved to the auction vault if the commitment matched.");
      await refreshBidAccount();
      await onAfterTx();
    } catch (e) {
      setNote(await friendlyTxError(e, connection));
      await refreshBidAccount();
    } finally {
      setBusy(null);
    }
  };

  if (config.privateMode) {
    return (
      <div className="rounded-2xl border border-brand-muted/40 bg-brand-cream/5 p-5 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-lime">
          Bidding
        </h3>
        <p className="mt-2 text-sm text-brand-muted">
          This auction uses private (TEE) mode. Public commit/reveal bidding is not
          available here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 rounded-2xl border border-brand-muted/40 bg-brand-cream/5 p-5 sm:p-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-lime">
          Place a bid
        </h3>
      </div>

      {!connected ? (
        <p className="text-sm text-brand-muted">
          Connect your wallet (top of the page) to commit or reveal a bid.
        </p>
      ) : null}

      {connected && bidOnChain?.exists && config.phase === 0 ? (
        <p className="rounded-xl border border-brand-lime/25 bg-brand-lime/10 px-4 py-3 text-sm text-brand-cream">
          The app checked the chain (no signature): this wallet already has a bid
          account for this auction, so a second commit is not allowed. Wait for the
          reveal phase, then use Reveal below—same browser if you committed here so
          the salt is still saved.
        </p>
      ) : null}

      {connected && bidOnChain?.exists && bidOnChain.revealed ? (
        <p className="text-sm text-brand-muted">
          Your bid for this wallet is already revealed on-chain.
        </p>
      ) : null}

      <div className="space-y-3">
        <label className={label} htmlFor="live-bid-sol">
          Bid amount (SOL)
        </label>
        <input
          id="live-bid-sol"
          className={field}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.0"
          value={bidSol}
          onChange={(e) => setBidSol(e.target.value)}
          disabled={!canTryCommit}
        />
        <p className="text-xs text-brand-muted">
          The app does not withdraw your bid amount on commit—only the on-chain program
          does, and only on reveal. Commit still costs a tiny account-rent deposit from
          Solana, separate from the bid you typed.
        </p>
        <button
          type="button"
          className={btnPrimary}
          disabled={!canTryCommit || busy !== null}
          onClick={() => onCommit()}
        >
          {busy === "commit" ? "Signing…" : "Sign & commit sealed bid"}
        </button>
        {!inCommitWindow && config.phase === 0 ? (
          <p className="text-xs text-brand-muted">
            You can only commit while the auction is in the bidding phase and before
            the commit deadline.
          </p>
        ) : null}
        {config.phase !== 0 ? (
          <p className="text-xs text-brand-muted">
            Bidding phase is closed for this auction (current phase:{" "}
            {config.phase === 1 ? "Reveal" : "Settled"}).
          </p>
        ) : null}
      </div>

      <div className="border-t border-brand-muted/30 pt-8">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-lime">
          Reveal bid
        </h4>
        <p className="mt-2 text-sm text-brand-muted">
          After the seller starts the reveal phase and before reveal ends, open your
          wallet and confirm. Requires the same amount and salt from your commit
          {storedSecrets ? " (loaded from this browser)." : " (saved in this browser after commit)."}
        </p>
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={!canTryReveal || busy !== null}
          onClick={() => onReveal()}
        >
          {busy === "reveal" ? "Signing…" : "Sign & reveal (pay bid to vault)"}
        </button>
        {!inRevealWindow && config.phase === 1 ? (
          <p className="mt-2 text-xs text-brand-muted">
            Reveal window runs from commit end until reveal end.
          </p>
        ) : null}
      </div>

      {note ? (
        <p className="rounded-xl border border-brand-muted/40 bg-brand-bg/60 px-4 py-3 text-sm text-brand-cream/95">
          {note}
        </p>
      ) : null}
    </div>
  );
}
