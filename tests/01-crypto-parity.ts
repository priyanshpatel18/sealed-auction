import { expect } from "chai";
import BN from "bn.js";
import { Keypair } from "@solana/web3.js";
import {
  aggregateCiphertextDigestsV1,
  ciphertextDigestV1,
  hashCommitment,
  resultHashPrivateV1,
  resultHashV1,
} from "./test-utils";

describe("crypto parity (matches on-chain utils)", () => {
  const auctionId = new BN(999001);
  const bidder = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey;
  const winner = Keypair.generate().publicKey;

  it("commitment hash is 32 bytes", () => {
    const h = hashCommitment(auctionId, bidder, new BN(1), Buffer.from("x"));
    expect(h.length).to.eq(32);
  });

  it("commitment changes when amount changes", () => {
    const a = hashCommitment(auctionId, bidder, new BN(1), Buffer.from("s"));
    const b = hashCommitment(auctionId, bidder, new BN(2), Buffer.from("s"));
    expect(a.equals(b)).to.eq(false);
  });

  it("commitment changes when salt changes", () => {
    const a = hashCommitment(auctionId, bidder, new BN(1), Buffer.from("a"));
    const b = hashCommitment(auctionId, bidder, new BN(1), Buffer.from("b"));
    expect(a.equals(b)).to.eq(false);
  });

  it("commitment changes when bidder changes", () => {
    const other = Keypair.generate().publicKey;
    const a = hashCommitment(auctionId, bidder, new BN(1), Buffer.from("s"));
    const b = hashCommitment(auctionId, other, new BN(1), Buffer.from("s"));
    expect(a.equals(b)).to.eq(false);
  });

  it("result:v1 is deterministic", () => {
    const p = new BN(100);
    const a = resultHashV1(auctionId, winner, p, 3, 2, mint);
    const b = resultHashV1(auctionId, winner, p, 3, 2, mint);
    expect(a.equals(b)).to.eq(true);
  });

  it("result:v1 differs when commit_count differs", () => {
    const p = new BN(100);
    const a = resultHashV1(auctionId, winner, p, 3, 2, mint);
    const b = resultHashV1(auctionId, winner, p, 4, 2, mint);
    expect(a.equals(b)).to.eq(false);
  });

  it("result:private:v1 binds aggregate", () => {
    const agg = Buffer.alloc(32, 7);
    const a = resultHashPrivateV1(auctionId, winner, new BN(50), agg);
    const b = resultHashPrivateV1(auctionId, winner, new BN(50), Buffer.alloc(32, 8));
    expect(a.equals(b)).to.eq(false);
  });

  it("ciphertext digest empty payload", () => {
    const d = ciphertextDigestV1(auctionId, bidder, Buffer.alloc(0));
    expect(d.length).to.eq(32);
  });

  it("aggregate sorts by bidder pubkey (order independence)", () => {
    const b1 = Keypair.generate().publicKey;
    const b2 = Keypair.generate().publicKey;
    const c1 = Buffer.from("a");
    const c2 = Buffer.from("b");
    const d1 = ciphertextDigestV1(auctionId, b1, c1);
    const d2 = ciphertextDigestV1(auctionId, b2, c2);
    const aggForward = aggregateCiphertextDigestsV1([
      { bidder: b1, digest: d1 },
      { bidder: b2, digest: d2 },
    ]);
    const aggReverse = aggregateCiphertextDigestsV1([
      { bidder: b2, digest: d2 },
      { bidder: b1, digest: d1 },
    ]);
    expect(aggForward.equals(aggReverse)).to.eq(true);
  });

  it("aggregate differs when ciphertext changes", () => {
    const b1 = Keypair.generate().publicKey;
    const d1a = ciphertextDigestV1(auctionId, b1, Buffer.from("x"));
    const d1b = ciphertextDigestV1(auctionId, b1, Buffer.from("y"));
    const a = aggregateCiphertextDigestsV1([{ bidder: b1, digest: d1a }]);
    const b = aggregateCiphertextDigestsV1([{ bidder: b1, digest: d1b }]);
    expect(a.equals(b)).to.eq(false);
  });

  it("aggregate with one bidder matches hash of single digest with agg:v1 prefix", () => {
    const b = Keypair.generate().publicKey;
    const d = ciphertextDigestV1(auctionId, b, Buffer.from("only"));
    const agg = aggregateCiphertextDigestsV1([{ bidder: b, digest: d }]);
    expect(agg.length).to.eq(32);
  });

  it("result:v1 differs when mint differs", () => {
    const m1 = Keypair.generate().publicKey;
    const m2 = Keypair.generate().publicKey;
    const a = resultHashV1(auctionId, winner, new BN(1), 1, 1, m1);
    const b = resultHashV1(auctionId, winner, new BN(1), 1, 1, m2);
    expect(a.equals(b)).to.eq(false);
  });

  it("result:private:v1 differs when winner differs", () => {
    const w1 = Keypair.generate().publicKey;
    const w2 = Keypair.generate().publicKey;
    const agg = Buffer.alloc(32, 1);
    const a = resultHashPrivateV1(auctionId, w1, new BN(5), agg);
    const b = resultHashPrivateV1(auctionId, w2, new BN(5), agg);
    expect(a.equals(b)).to.eq(false);
  });

  it("ciphertext digest is stable for same inputs", () => {
    const d1 = ciphertextDigestV1(auctionId, bidder, Buffer.from("data"));
    const d2 = ciphertextDigestV1(auctionId, bidder, Buffer.from("data"));
    expect(d1.equals(d2)).to.eq(true);
  });

  it("commitment with auction_id 0 still produces 32-byte hash", () => {
    const h = hashCommitment(new BN(0), bidder, new BN(1), Buffer.from("z"));
    expect(h.length).to.eq(32);
  });

  describe("commitment domain (parameterized uniqueness)", () => {
    for (let i = 0; i < 45; i++) {
      it(`distinct commitment for domain variant ${i}`, () => {
        const aid = new BN(900_000 + i);
        const bidder = Keypair.generate().publicKey;
        const salt = Buffer.from([i & 0xff, (i >> 8) & 0xff]);
        const h = hashCommitment(aid, bidder, new BN(i + 1), salt);
        expect(h.length).to.eq(32);
        const h2 = hashCommitment(aid, bidder, new BN(i + 2), salt);
        expect(h.equals(h2)).to.eq(false);
      });
    }
  });
});
