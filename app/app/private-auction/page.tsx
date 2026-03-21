"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import type { SealedAuctionProgram } from "../../../target/types/sealed_auction_program";
import BN from "bn.js";
import Link from "next/link";
import {
  BASE_ENDPOINT,
  EPHEMERAL_ENDPOINT,
  PLAYER_STORAGE_KEY,
} from "@/lib/config";
import { programFor } from "@/lib/program";
import { auctionPda, bidCipherPda } from "@/lib/pdas";
import {
  aggregateCiphertextDigestsV1,
  ciphertextDigestV1,
  resultHashPrivateV1,
} from "@/lib/crypto";
import { connectPrivateTee } from "@/lib/tee";
import { ensureFunds, walletAdapterFrom } from "@/lib/solana";

export default function PrivateAuctionPage() {
  const [auctionIdStr, setAuctionIdStr] = useState("1");
  const [teeUrl, setTeeUrl] = useState<string | null>(null);
  const [teeErr, setTeeErr] = useState<string | null>(null);
  const [auctionPhase, setAuctionPhase] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [resultHashHex, setResultHashHex] = useState<string | null>(null);
  const [verifyOk, setVerifyOk] = useState<boolean | null>(null);
  const [bidPreview, setBidPreview] = useState<string>("");

  const kpRef = useRef<import("@solana/web3.js").Keypair | null>(null);
  const progRef = useRef<Program<SealedAuctionProgram> | null>(null);

  const auctionIdBn = (() => {
    try {
      return new BN(auctionIdStr, 10);
    } catch {
      return new BN(1);
    }
  })();

  const init = useCallback(async () => {
    const { Keypair } = await import("@solana/web3.js");
    const { loadOrCreateKeypair } = await import("@/lib/solana");
    if (!kpRef.current) kpRef.current = loadOrCreateKeypair(PLAYER_STORAGE_KEY);
    const kp = kpRef.current!;
    const conn = new Connection(BASE_ENDPOINT, "confirmed");
    await ensureFunds(conn, kp);
    const wallet = walletAdapterFrom(kp);
    progRef.current = programFor(conn, wallet);
  }, []);

  useEffect(() => {
    init().catch(console.error);
  }, [init]);

  const refreshAuction = useCallback(async () => {
    const prog = progRef.current;
    if (!prog) return;
    try {
      const acct = await prog.account.auctionConfig.fetch(auctionPda(auctionIdBn));
      setAuctionPhase(acct.phase);
      setWinner(acct.winner.toBase58());
      setResultHashHex(Buffer.from(acct.resultHash).toString("hex"));
    } catch {
      setAuctionPhase(null);
    }
  }, [auctionIdBn]);

  useEffect(() => {
    refreshAuction().catch(console.error);
    const id = setInterval(() => refreshAuction(), 5000);
    return () => clearInterval(id);
  }, [refreshAuction]);

  const onTeeConnect = async () => {
    setTeeErr(null);
    try {
      if (!kpRef.current) {
        const { loadOrCreateKeypair } = await import("@/lib/solana");
        kpRef.current = loadOrCreateKeypair(PLAYER_STORAGE_KEY);
      }
      const kp = kpRef.current!;
      const { teeHttpUrl } = await connectPrivateTee(
        EPHEMERAL_ENDPOINT,
        kp.publicKey,
        async (msg) => {
          const nacl = await import("tweetnacl");
          return nacl.sign.detached(msg, kp.secretKey);
        }
      );
      setTeeUrl(teeHttpUrl);
    } catch (e) {
      setTeeErr((e as Error).message);
    }
  };

  /** Demo-only: recompute expected result_hash from on-chain winner + mock winning price + ciphertext PDAs */
  const onVerifyResultHash = async () => {
    const prog = progRef.current;
    if (!prog || !kpRef.current) return;
    try {
      const acct = await prog.account.auctionConfig.fetch(auctionPda(auctionIdBn));
      const winningPrice = new BN(acct.winningPrice.toString());
      const winPk = acct.winner;
      const rows: { bidder: import("@solana/web3.js").PublicKey; digest: Buffer }[] =
        [];
      for (const bidderStr of bidPreview.split(/[\s,]+/).filter(Boolean)) {
        const { PublicKey } = await import("@solana/web3.js");
        const bidder = new PublicKey(bidderStr);
        const pda = bidCipherPda(auctionIdBn, bidder);
        const info = await prog.provider.connection.getAccountInfo(pda);
        if (!info) continue;
        const dec = prog.coder.accounts.decode(
          "bidCiphertext",
          info.data
        ) as {
          ciphertext: number[];
          ciphertextLen: number;
        };
        const ct = Buffer.from(dec.ciphertext.slice(0, dec.ciphertextLen));
        const d = ciphertextDigestV1(auctionIdBn, bidder, ct);
        rows.push({ bidder, digest: d });
      }
      const agg = aggregateCiphertextDigestsV1(rows);
      const expected = resultHashPrivateV1(auctionIdBn, winPk, winningPrice, agg);
      const onChain = Buffer.from(acct.resultHash);
      setVerifyOk(expected.equals(onChain));
    } catch (e) {
      console.error(e);
      setVerifyOk(false);
    }
  };

  return (
    <main className="space-y-8">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold">Private auction — TEE + digest</h1>
        <Link href="/" className="text-emerald-400 text-sm hover:underline">
          Home
        </Link>
      </div>

      <p className="text-sm text-zinc-400 max-w-prose">
        Bids are opaque ciphertexts on-chain. After{" "}
        <code className="text-zinc-300">reveal_end</code>, a TEE (or privileged
        signer in dev) calls{" "}
        <code className="text-zinc-300">compute_winner_private</code> with an
        aggregate digest binding all ciphertexts; the program stores{" "}
        <code className="text-zinc-300">result_hash</code> only. Use{" "}
        <code className="text-zinc-300">verifyTeeRpcIntegrity</code> +{" "}
        <code className="text-zinc-300">getAuthToken</code> before connecting to{" "}
        <code className="text-zinc-300">tee.magicblock.app?token=…</code>.
      </p>

      <section className="rounded-lg border border-zinc-800 p-4 space-y-3 bg-zinc-900/50">
        <label className="block text-sm text-zinc-400">Auction id</label>
        <input
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 font-mono text-sm"
          value={auctionIdStr}
          onChange={(e) => setAuctionIdStr(e.target.value.replace(/\D/g, "") || "0")}
        />
        <p className="text-xs text-zinc-500">
          Phase: {auctionPhase === null ? "—" : auctionPhase} (2 = settled)
        </p>
        <p className="text-xs text-zinc-500 break-all">
          Winner (public): {winner ?? "—"}
        </p>
        <p className="text-xs text-zinc-500 break-all">
          result_hash (hex): {resultHashHex ?? "—"}
        </p>
      </section>

      <section className="rounded-lg border border-zinc-800 p-4 space-y-2">
        <h2 className="font-medium">TEE URL (Private ER)</h2>
        <button
          type="button"
          onClick={() => onTeeConnect()}
          className="text-sm px-3 py-1 rounded bg-violet-900/60 hover:bg-violet-800/80"
        >
          verifyTeeRpcIntegrity + getAuthToken
        </button>
        {teeErr && <p className="text-xs text-red-400">{teeErr}</p>}
        {teeUrl && (
          <p className="text-xs font-mono break-all text-emerald-300">{teeUrl}</p>
        )}
        <p className="text-xs text-zinc-600">
          Requires <code className="text-zinc-400">tweetnacl</code> for signing (
          <code className="text-zinc-400">yarn add tweetnacl</code> in /app).
        </p>
      </section>

      <section className="rounded-lg border border-zinc-800 p-4 space-y-2">
        <h2 className="font-medium">Verify result_hash (client)</h2>
        <p className="text-xs text-zinc-500">
          Paste bidder pubkeys (one per line) that have BidCiphertext PDAs for this
          auction. Compares SHA256 chain to on-chain{" "}
          <code className="text-zinc-300">result_hash</code>.
        </p>
        <textarea
          className="w-full h-24 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 font-mono text-xs"
          placeholder="Bidder pubkeys…"
          value={bidPreview}
          onChange={(e) => setBidPreview(e.target.value)}
        />
        <button
          type="button"
          onClick={() => onVerifyResultHash()}
          className="text-sm px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
        >
          Verify
        </button>
        {verifyOk !== null && (
          <p className={`text-sm ${verifyOk ? "text-emerald-400" : "text-red-400"}`}>
            {verifyOk ? "Matches on-chain result_hash" : "Mismatch or missing data"}
          </p>
        )}
      </section>
    </main>
  );
}
