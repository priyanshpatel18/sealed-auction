import { expect } from "chai";
import BN from "bn.js";
import {
  aggregateCiphertextDigestsV1,
  ciphertextDigestV1,
  resultHashPrivateV1,
  sleep,
  uniqueAuctionId,
} from "./test-utils";
import {
  auctionPdas,
  bidCipherPda,
  fundVaultSol,
  getFixture,
  SystemProgram,
} from "./fixture";

describe("private mode — e2e", function () {
  this.timeout(180_000);

  it("aggregate + compute_winner_private + settle_private + result_hash parity", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const bidCipherA = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const bidCipherB = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderB.publicKey);

    const now = Math.floor(Date.now() / 1000);
    const commitEnd = now + 8;
    const revealEnd = now + 10;

    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(commitEnd),
        new BN(revealEnd),
        true,
        ""
      )
      .accounts({
        seller: ctx.seller,
        auction,
        runtime,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const ctA = Buffer.from("demo-cipher-a");
    const ctB = Buffer.from("demo-cipher-b");

    await ctx.program.methods
      .submitEncryptedBid(auctionId, Buffer.from(ctA))
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bidCipher: bidCipherA,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();

    await ctx.program.methods
      .submitEncryptedBid(auctionId, Buffer.from(ctB))
      .accounts({
        bidder: ctx.bidderB.publicKey,
        auction,
        bidCipher: bidCipherB,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderB])
      .rpc();

    const agg = aggregateCiphertextDigestsV1([
      {
        bidder: ctx.bidderA.publicKey,
        digest: ciphertextDigestV1(auctionId, ctx.bidderA.publicKey, ctA),
      },
      {
        bidder: ctx.bidderB.publicKey,
        digest: ciphertextDigestV1(auctionId, ctx.bidderB.publicKey, ctB),
      },
    ]);
    const winningPrice = new BN(400_000_000);

    await fundVaultSol(ctx, vault, 2_000_000_000n);

    await sleep(12000);

    await ctx.program.methods
      .computeWinnerPrivate(
        auctionId,
        ctx.bidderA.publicKey,
        winningPrice,
        Array.from(agg) as number[]
      )
      .accounts({ payer: ctx.seller, auction })
      .remainingAccounts([
        { pubkey: bidCipherA, isSigner: false, isWritable: false },
        { pubkey: bidCipherB, isSigner: false, isWritable: false },
      ])
      .rpc();

    const mid = await ctx.program.account.auctionConfig.fetch(auction);
    expect(mid.teeWinnerReady).to.eq(true);
    expect(mid.winner.toBase58()).to.eq(ctx.bidderA.publicKey.toBase58());

    const expectedRh = resultHashPrivateV1(
      auctionId,
      ctx.bidderA.publicKey,
      winningPrice,
      agg
    );
    expect(Buffer.from(mid.resultHash).equals(expectedRh)).to.eq(true);

    await ctx.program.methods
      .settlePrivate(auctionId)
      .accounts({
        authority: ctx.seller,
        auction,
        vault,
        seller: ctx.seller,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const fin = await ctx.program.account.auctionConfig.fetch(auction);
    expect(fin.phase).to.eq(2);
  });

  it("three bidders: aggregate order independent of remaining_accounts order", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const cA = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const cB = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderB.publicKey);
    const cC = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderC.publicKey);

    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 6),
        new BN(now + 9),
        true,
        ""
      )
      .accounts({
        seller: ctx.seller,
        auction,
        runtime,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const tA = Buffer.from("1");
    const tB = Buffer.from("2");
    const tC = Buffer.from("3");

    for (const [kp, pda, buf] of [
      [ctx.bidderA, cA, tA],
      [ctx.bidderB, cB, tB],
      [ctx.bidderC, cC, tC],
    ] as const) {
      await ctx.program.methods
        .submitEncryptedBid(auctionId, Buffer.from(buf))
        .accounts({
          bidder: kp.publicKey,
          auction,
          bidCipher: pda,
          systemProgram: SystemProgram.programId,
        })
        .signers([kp])
        .rpc();
    }

    const agg = aggregateCiphertextDigestsV1([
      {
        bidder: ctx.bidderA.publicKey,
        digest: ciphertextDigestV1(auctionId, ctx.bidderA.publicKey, tA),
      },
      {
        bidder: ctx.bidderB.publicKey,
        digest: ciphertextDigestV1(auctionId, ctx.bidderB.publicKey, tB),
      },
      {
        bidder: ctx.bidderC.publicKey,
        digest: ciphertextDigestV1(auctionId, ctx.bidderC.publicKey, tC),
      },
    ]);

    await fundVaultSol(ctx, vault, 5_000_000_000n);
    await sleep(12000);

    await ctx.program.methods
      .computeWinnerPrivate(
        auctionId,
        ctx.bidderC.publicKey,
        new BN(1_000_000_000),
        Array.from(agg) as number[]
      )
      .accounts({ payer: ctx.seller, auction })
      .remainingAccounts([
        { pubkey: cC, isSigner: false, isWritable: false },
        { pubkey: cA, isSigner: false, isWritable: false },
        { pubkey: cB, isSigner: false, isWritable: false },
      ])
      .rpc();

    const mid = await ctx.program.account.auctionConfig.fetch(auction);
    expect(mid.winner.toBase58()).to.eq(ctx.bidderC.publicKey.toBase58());

    await ctx.program.methods
      .settlePrivate(auctionId)
      .accounts({
        authority: ctx.seller,
        auction,
        vault,
        seller: ctx.seller,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  it("single ciphertext: compute + settle", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const bc = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);

    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 8),
        true,
        ""
      )
      .accounts({
        seller: ctx.seller,
        auction,
        runtime,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const ct = Buffer.from("solo");
    await ctx.program.methods
      .submitEncryptedBid(auctionId, ct)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bidCipher: bc,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();

    const agg = aggregateCiphertextDigestsV1([
      {
        bidder: ctx.bidderA.publicKey,
        digest: ciphertextDigestV1(auctionId, ctx.bidderA.publicKey, ct),
      },
    ]);

    await fundVaultSol(ctx, vault, 2_000_000_000n);
    await sleep(12000);

    await ctx.program.methods
      .computeWinnerPrivate(
        auctionId,
        ctx.bidderA.publicKey,
        new BN(999_999_999),
        Array.from(agg) as number[]
      )
      .accounts({ payer: ctx.seller, auction })
      .remainingAccounts([{ pubkey: bc, isSigner: false, isWritable: false }])
      .rpc();

    await ctx.program.methods
      .settlePrivate(auctionId)
      .accounts({
        authority: ctx.seller,
        auction,
        vault,
        seller: ctx.seller,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const fin = await ctx.program.account.auctionConfig.fetch(auction);
    expect(fin.phase).to.eq(2);
  });
});
