import { sha256 } from "@noble/hashes/sha256";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

/** Same construction as `tests/test-utils.ts` / on-chain `hash_commitment`. */
export function hashCommitment(
  auctionId: BN,
  bidder: PublicKey,
  amount: BN,
  salt: Buffer
): Buffer {
  const parts = [
    new TextEncoder().encode("sealed-auction:v1"),
    Buffer.from(auctionId.toArray("le", 8)),
    bidder.toBuffer(),
    Buffer.from(amount.toArray("le", 8)),
    salt,
  ];
  return toBuf(sha256(Buffer.concat(parts)));
}

/** Parity with `utils::result_hash_v1` / `tests/test-utils.ts` (native SOL — 32 zero bytes). */
export function resultHashV1(
  auctionId: BN,
  winner: PublicKey,
  winningPrice: BN,
  commitCount: number,
  revealCount: number
): Buffer {
  const cc = Buffer.alloc(4);
  cc.writeUInt32LE(commitCount, 0);
  const rc = Buffer.alloc(4);
  rc.writeUInt32LE(revealCount, 0);
  const parts = [
    new TextEncoder().encode("result:v1"),
    Buffer.from(auctionId.toArray("le", 8)),
    winner.toBuffer(),
    Buffer.from(winningPrice.toArray("le", 8)),
    cc,
    rc,
    Buffer.alloc(32, 0),
  ];
  return toBuf(sha256(Buffer.concat(parts)));
}

/** Mirrors `utils::ciphertext_digest_v1` */
export function ciphertextDigestV1(
  auctionId: BN,
  bidder: PublicKey,
  ciphertext: Buffer
): Buffer {
  const parts = [
    new TextEncoder().encode("cipher:v1"),
    Buffer.from(auctionId.toArray("le", 8)),
    bidder.toBuffer(),
    ciphertext,
  ];
  const flat = Buffer.concat(parts);
  return toBuf(sha256(flat));
}

/** Mirrors `utils::aggregate_ciphertext_digests_v1` — digests sorted by bidder pubkey bytes */
export function aggregateCiphertextDigestsV1(
  rows: { bidder: PublicKey; digest: Buffer }[]
): Buffer {
  const sorted = [...rows].sort((a, b) =>
    Buffer.compare(a.bidder.toBuffer(), b.bidder.toBuffer())
  );
  const parts = [
    new TextEncoder().encode("agg:v1"),
    ...sorted.map((r) => r.digest),
  ];
  const flat = Buffer.concat(parts);
  return toBuf(sha256(flat));
}

/** Mirrors `utils::result_hash_private_v1` */
export function resultHashPrivateV1(
  auctionId: BN,
  winner: PublicKey,
  winningPrice: BN,
  aggregateDigest: Buffer
): Buffer {
  const parts = [
    new TextEncoder().encode("result:private:v1"),
    Buffer.from(auctionId.toArray("le", 8)),
    winner.toBuffer(),
    Buffer.from(winningPrice.toArray("le", 8)),
    aggregateDigest,
  ];
  const flat = Buffer.concat(parts);
  return toBuf(sha256(flat));
}
