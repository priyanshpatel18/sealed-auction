import { sha256 } from "@noble/hashes/sha256";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
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
