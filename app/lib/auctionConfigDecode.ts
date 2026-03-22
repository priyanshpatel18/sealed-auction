import type { Program } from "@coral-xyz/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import type { SealedAuctionProgram } from "@/types/sealed_auction_program";

const ACCOUNT_NAME = "AuctionConfig" as const;

/**
 * Decode `AuctionConfig` account data. Short buffers (older program layout without
 * trailing `metadata_uri`) are zero-padded so the current IDL layout still decodes;
 * `metadata_uri` becomes "".
 */
export function decodeAuctionConfigData(
  program: Program<SealedAuctionProgram>,
  data: Buffer | Uint8Array
) {
  const expected =
    (program.account as { auctionConfig: { size: number } }).auctionConfig.size;
  let buf = Buffer.from(data);
  if (buf.length < expected) {
    buf = Buffer.concat([buf, Buffer.alloc(expected - buf.length, 0)]);
  } else if (buf.length > expected) {
    buf = buf.subarray(0, expected);
  }
  return program.coder.accounts.decode(ACCOUNT_NAME, buf);
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
