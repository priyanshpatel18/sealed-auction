import type { Program } from "@coral-xyz/anchor";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Buffer } from "buffer";
import type { SealedAuctionProgram } from "@/types/sealed_auction_program";

/** Anchor 0.30+ camelCase idl account name (see `program.idl.accounts`). */
const ACCOUNT_CAMEL = "auctionConfig" as const;

/** Legacy `AuctionConfig` on devnet: 8-byte disc + 220-byte body, **no** `metadata_uri` field. */
const LEGACY_AUCTION_CONFIG_TOTAL = 228;

/**
 * Decode pre–`metadata_uri` layout (220 bytes after discriminator).
 * Matches `AuctionConfig` fields through `tee_winner_ready` only.
 */
function decodeLegacyAuctionConfigBody(body: Buffer) {
  let o = 0;
  const seller = new PublicKey(body.subarray(o, o + 32));
  o += 32;
  const vault = new PublicKey(body.subarray(o, o + 32));
  o += 32;
  const auctionId = new BN(body.subarray(o, o + 8), "le");
  o += 8;
  const phase = body.readUInt8(o);
  o += 1;
  const biddingStart = new BN(body.readBigInt64LE(o).toString());
  o += 8;
  const commitEnd = new BN(body.readBigInt64LE(o).toString());
  o += 8;
  const revealEnd = new BN(body.readBigInt64LE(o).toString());
  o += 8;
  const bump = body.readUInt8(o);
  o += 1;
  const leaderBidder = new PublicKey(body.subarray(o, o + 32));
  o += 32;
  const leaderBid = new BN(body.subarray(o, o + 8), "le");
  o += 8;
  const winner = new PublicKey(body.subarray(o, o + 32));
  o += 32;
  const winningPrice = new BN(body.subarray(o, o + 8), "le");
  o += 8;
  const resultHash = body.subarray(o, o + 32);
  o += 32;
  const commitCount = body.readUInt32LE(o);
  o += 4;
  const revealCount = body.readUInt32LE(o);
  o += 4;
  const privateMode = body.readUInt8(o) !== 0;
  o += 1;
  const teeWinnerReady = body.readUInt8(o) !== 0;
  o += 1;
  if (o !== body.length) {
    throw new Error(`Legacy AuctionConfig parse length mismatch: consumed ${o}, have ${body.length}`);
  }
  return {
    seller,
    vault,
    auctionId,
    phase,
    biddingStart,
    commitEnd,
    revealEnd,
    bump,
    leaderBidder,
    leaderBid,
    winner,
    winningPrice,
    resultHash: Uint8Array.from(resultHash),
    commitCount,
    revealCount,
    privateMode,
    teeWinnerReady,
    metadataUri: "",
  };
}

/**
 * Decode `AuctionConfig` account data.
 * - Anchor **0.32** `BorshAccountsCoder` keys accounts by **camelCase** (`auctionConfig`), not `AuctionConfig`.
 * - **228-byte** accounts are an older on-chain layout **without** `metadata_uri`; the current IDL cannot Borsh-decode them.
 */
export function decodeAuctionConfigData(
  program: Program<SealedAuctionProgram>,
  data: Buffer | Uint8Array
) {
  let buf = Buffer.from(data);
  if (buf.length === LEGACY_AUCTION_CONFIG_TOTAL) {
    return decodeLegacyAuctionConfigBody(buf.subarray(8));
  }

  const expected = program.account.auctionConfig.size;
  if (buf.length < expected) {
    buf = Buffer.concat([buf, Buffer.alloc(expected - buf.length, 0)]);
  }
  return program.coder.accounts.decode(ACCOUNT_CAMEL, buf);
}

/** Fetch `AuctionConfig` at `address` — tolerates short account data (pre–metadata_uri layouts). */
export async function fetchAuctionConfigAccount(
  connection: Connection,
  program: Program<SealedAuctionProgram>,
  address: PublicKey
) {
  const info = await connection.getAccountInfo(address);
  if (!info?.data.length) return null;
  try {
    return decodeAuctionConfigData(program, info.data);
  } catch {
    return null;
  }
}
