import { createHash } from "crypto";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

/** Matches on-chain `ciphertext_digest_v1` + `aggregate_ciphertext_digests_v1` */
export function ciphertextDigestV1(
  auctionId: BN,
  bidder: PublicKey,
  ciphertext: Buffer
): Buffer {
  const h = createHash("sha256");
  h.update(Buffer.from("cipher:v1"));
  h.update(Buffer.from(auctionId.toArray("le", 8)));
  h.update(bidder.toBuffer());
  h.update(ciphertext);
  return h.digest();
}

export function aggregateCiphertextDigestsV1(
  rows: { bidder: PublicKey; digest: Buffer }[]
): Buffer {
  const sorted = [...rows].sort((a, b) =>
    Buffer.compare(a.bidder.toBuffer(), b.bidder.toBuffer())
  );
  const h = createHash("sha256");
  h.update(Buffer.from("agg:v1"));
  for (const r of sorted) {
    h.update(r.digest);
  }
  return h.digest();
}
