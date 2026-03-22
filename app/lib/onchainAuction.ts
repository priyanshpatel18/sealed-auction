import type { Connection } from "@solana/web3.js";
import BN from "bn.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { decodeAuctionConfigData } from "@/lib/auctionConfigDecode";
import { programReadOnly } from "@/lib/program";
import { auctionPda, runtimePda, vaultPda } from "@/lib/pdas";

function bytesToHex(bytes: number[] | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  return [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type OnchainAuctionSnapshot = {
  config: {
    seller: string;
    vault: string;
    auctionId: string;
    phase: number;
    biddingStartSec: number;
    commitEndSec: number;
    revealEndSec: number;
    leaderBidder: string;
    leaderBid: string;
    winner: string;
    winningPrice: string;
    resultHashHex: string;
    commitCount: number;
    revealCount: number;
    privateMode: boolean;
    teeWinnerReady: boolean;
    bump: number;
    metadataUri: string;
  };
  runtime: {
    auctionId: string;
    leaderBid: string;
    leaderBidder: string;
    commitCount: number;
    revealCount: number;
  } | null;
  vaultLamports: number;
  pdas: { auction: string; runtime: string; vault: string };
};

export function formatSol(lamports: number, maxFractionDigits = 6): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return `${sol.toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  })} SOL`;
}

export type LoadOnchainAuctionFailure =
  | {
      reason: "no_account";
      auctionPda: string;
    }
  | {
      reason: "wrong_owner";
      auctionPda: string;
      actualOwner: string;
      expectedProgram: string;
    }
  | {
      reason: "decode_failed";
      auctionPda: string;
      message: string;
    };

export type LoadOnchainAuctionResult =
  | { ok: true; snapshot: OnchainAuctionSnapshot }
  | { ok: false; failure: LoadOnchainAuctionFailure };

/** Short message for live page / debugging when a load fails. */
export function describeAuctionLoadFailure(
  failure: LoadOnchainAuctionFailure,
  rpcLabel?: string
): string {
  const rpc = rpcLabel?.trim() || "this RPC";
  switch (failure.reason) {
    case "no_account":
      return `No auction account at the program-derived address on ${rpc}. Usual causes: this auction id was never initialized on this cluster, or your wallet RPC does not match the cluster where you created it (check devnet vs mainnet vs local). PDA: ${failure.auctionPda}.`;
    case "wrong_owner":
      return `Unexpected account owner at auction PDA (owner ${failure.actualOwner.slice(0, 12)}…, expected program ${failure.expectedProgram.slice(0, 12)}…).`;
    case "decode_failed":
      return `Account data does not match the app IDL: ${failure.message}`;
  }
}

/**
 * Same as {@link fetchOnchainAuctionSnapshot} but distinguishes missing account,
 * wrong program owner, and IDL/layout decode errors (all previously surfaced as `null`).
 */
export async function loadOnchainAuctionSnapshot(
  connection: Connection,
  auctionIdBn: BN
): Promise<LoadOnchainAuctionResult> {
  const program = programReadOnly(connection);
  const ap = auctionPda(auctionIdBn);
  const rp = runtimePda(auctionIdBn);
  const vp = vaultPda(auctionIdBn);

  const info = await connection.getAccountInfo(ap);
  if (!info?.data.length) {
    return {
      ok: false,
      failure: { reason: "no_account", auctionPda: ap.toBase58() },
    };
  }

  if (!info.owner.equals(program.programId)) {
    return {
      ok: false,
      failure: {
        reason: "wrong_owner",
        auctionPda: ap.toBase58(),
        actualOwner: info.owner.toBase58(),
        expectedProgram: program.programId.toBase58(),
      },
    };
  }

  let raw;
  try {
    raw = decodeAuctionConfigData(program, info.data);
  } catch (e) {
    return {
      ok: false,
      failure: {
        reason: "decode_failed",
        auctionPda: ap.toBase58(),
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }

  let runtime: OnchainAuctionSnapshot["runtime"] = null;
  try {
    const rt = await program.account.auctionRuntime.fetch(rp);
    runtime = {
      auctionId: rt.auctionId.toString(),
      leaderBid: rt.leaderBid.toString(),
      leaderBidder: rt.leaderBidder.toBase58(),
      commitCount: rt.commitCount,
      revealCount: rt.revealCount,
    };
  } catch {
    runtime = null;
  }

  const vaultInfo = await connection.getAccountInfo(vp);
  const vaultLamports = vaultInfo?.lamports ?? 0;

  const rh = raw.resultHash as unknown as number[] | Uint8Array;

  return {
    ok: true,
    snapshot: {
      config: {
        seller: raw.seller.toBase58(),
        vault: raw.vault.toBase58(),
        auctionId: raw.auctionId.toString(),
        phase: raw.phase,
        biddingStartSec: raw.biddingStart.toNumber(),
        commitEndSec: raw.commitEnd.toNumber(),
        revealEndSec: raw.revealEnd.toNumber(),
        leaderBidder: raw.leaderBidder.toBase58(),
        leaderBid: raw.leaderBid.toString(),
        winner: raw.winner.toBase58(),
        winningPrice: raw.winningPrice.toString(),
        resultHashHex: bytesToHex(rh),
        commitCount: raw.commitCount,
        revealCount: raw.revealCount,
        privateMode: raw.privateMode,
        teeWinnerReady: raw.teeWinnerReady,
        bump: raw.bump,
        metadataUri: raw.metadataUri ?? "",
      },
      runtime,
      vaultLamports,
      pdas: {
        auction: ap.toBase58(),
        runtime: rp.toBase58(),
        vault: vp.toBase58(),
      },
    },
  };
}

export async function fetchOnchainAuctionSnapshot(
  connection: Connection,
  auctionIdBn: BN
): Promise<OnchainAuctionSnapshot | null> {
  const r = await loadOnchainAuctionSnapshot(connection, auctionIdBn);
  return r.ok ? r.snapshot : null;
}
