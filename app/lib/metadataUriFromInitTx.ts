import type { Connection } from "@solana/web3.js";
import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Buffer } from "buffer";

/** `initialize_auction` discriminator from `sealed_auction_program.json` — keep in sync with IDL. */
const INIT_AUCTION_DISC = Buffer.from([37, 10, 117, 197, 208, 88, 117, 62]);

function parseInitAuctionMetadataUri(
  data: Buffer,
  expectAuctionId: bigint
): string | null {
  if (data.length < 36) return null;
  if (!data.subarray(0, 8).equals(INIT_AUCTION_DISC)) return null;
  let o = 8;
  const aid = data.readBigUInt64LE(o);
  o += 8;
  if (aid !== expectAuctionId) return null;
  o += 8 * 3;
  o += 1;
  if (o + 4 > data.length) return null;
  const slen = data.readUInt32LE(o);
  o += 4;
  if (slen > 2048 || o + slen > data.length) return null;
  const uri = data.subarray(o, o + slen).toString("utf8").trim();
  return uri || null;
}

/**
 * Legacy `AuctionConfig` may store empty `metadata_uri` while the init tx still carried the
 * Pinata / IPFS URL. Scan recent signatures for `auctionPda` and decode `initialize_auction`.
 */
export async function recoverMetadataUriFromInitTx(
  connection: Connection,
  programId: PublicKey,
  auctionPda: PublicKey,
  auctionId: BN
): Promise<string | null> {
  const expectId = BigInt(auctionId.toString(10));
  let sigs;
  try {
    sigs = await connection.getSignaturesForAddress(auctionPda, { limit: 40 });
  } catch {
    return null;
  }

  for (const si of sigs) {
    if (si.err) continue;
    let tx;
    try {
      tx = await connection.getTransaction(si.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
    } catch {
      continue;
    }
    if (!tx?.transaction) continue;

    const message = tx.transaction.message as {
      getAccountKeys?: (opts?: {
        accountKeysFromLookups?: {
          writable: PublicKey[];
          readonly: PublicKey[];
        };
      }) => { get: (i: number) => PublicKey; staticAccountKeys: PublicKey[] };
      compiledInstructions?: { programIdIndex: number; data: Uint8Array }[];
      instructions?: {
        programId?: PublicKey;
        programIdIndex?: number;
        data: Buffer | Uint8Array;
      }[];
      accountKeys?: PublicKey[];
      staticAccountKeys?: PublicKey[];
    };
    const meta = tx.meta;

    const keys =
      typeof message.getAccountKeys === "function"
        ? message.getAccountKeys({
            accountKeysFromLookups: meta?.loadedAddresses ?? undefined,
          })
        : null;

    const fallback = message.staticAccountKeys ?? message.accountKeys;

    const pidAt = (idx: number): PublicKey | null => {
      try {
        return keys?.get(idx) ?? fallback?.[idx] ?? null;
      } catch {
        return fallback?.[idx] ?? null;
      }
    };

    if (message.compiledInstructions?.length) {
      for (const ix of message.compiledInstructions) {
        const pid = pidAt(ix.programIdIndex);
        if (!pid?.equals(programId)) continue;
        const uri = parseInitAuctionMetadataUri(Buffer.from(ix.data), expectId);
        if (uri) return uri;
      }
    }

    if (message.instructions?.length) {
      for (const ix of message.instructions) {
        const pid = ix.programId ?? pidAt(ix.programIdIndex ?? 0);
        if (!pid?.equals(programId)) continue;
        const raw = ix.data;
        const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        const uri = parseInitAuctionMetadataUri(buf, expectId);
        if (uri) return uri;
      }
    }
  }

  return null;
}
