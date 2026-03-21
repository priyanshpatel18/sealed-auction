import { expect } from "chai";
import BN from "bn.js";
import {
  hashCommitment,
  resultHashV1,
  sleep,
  uniqueAuctionId,
} from "./test-utils";
import {
  auctionPdas,
  bidPda,
  ensureBidderAta,
  ensureSellerAta,
  getFixture,
  mintTokensTo,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SystemProgram,
  TOKEN_PROGRAM_ID,
} from "./fixture";

describe("public mode — e2e & settlement", function () {
  this.timeout(180_000);

  it("full flow: commit → start_reveal → reveal → settle + result_hash parity", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const sellerAta = await ensureSellerAta(ctx);
    const bidderAAta = await ensureBidderAta(ctx, ctx.bidderA.publicKey);
    const bidderBAta = await ensureBidderAta(ctx, ctx.bidderB.publicKey);

    await mintTokensTo(ctx, sellerAta.address, 1_000_000_000_000n);
    await mintTokensTo(ctx, bidderAAta.address, 500_000_000_000n);
    await mintTokensTo(ctx, bidderBAta.address, 500_000_000_000n);

    const now = Math.floor(Date.now() / 1000);
    const biddingStart = now - 2;
    const commitEnd = now + 4;
    const revealEnd = now + 20;

    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(biddingStart),
        new BN(commitEnd),
        new BN(revealEnd),
        false
      )
      .accounts({
        seller: ctx.seller,
        tokenMint: ctx.mint,
        auction,
        runtime,
        vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const saltA = Buffer.from("salt-a");
    const saltB = Buffer.from("salt-b");
    const bidAmountA = new BN(300_000_000_000);
    const bidAmountB = new BN(100_000_000_000);
    const commA = Array.from(
      hashCommitment(auctionId, ctx.bidderA.publicKey, bidAmountA, saltA)
    ) as number[];
    const commB = Array.from(
      hashCommitment(auctionId, ctx.bidderB.publicKey, bidAmountB, saltB)
    ) as number[];

    const bidPdaA = bidPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const bidPdaB = bidPda(ctx.program.programId, auctionId, ctx.bidderB.publicKey);

    await ctx.program.methods
      .commitBid(auctionId, commA)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bid: bidPdaA,
        runtime,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();

    await ctx.program.methods
      .commitBid(auctionId, commB)
      .accounts({
        bidder: ctx.bidderB.publicKey,
        auction,
        bid: bidPdaB,
        runtime,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderB])
      .rpc();

    await sleep(5000);

    await ctx.program.methods
      .startReveal(auctionId)
      .accounts({ payer: ctx.seller, auction })
      .rpc();

    await ctx.program.methods
      .revealBid(auctionId, bidAmountA, saltA)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bid: bidPdaA,
        runtime,
        bidderToken: bidderAAta.address,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.bidderA])
      .rpc();

    await ctx.program.methods
      .revealBid(auctionId, bidAmountB, saltB)
      .accounts({
        bidder: ctx.bidderB.publicKey,
        auction,
        bid: bidPdaB,
        runtime,
        bidderToken: bidderBAta.address,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.bidderB])
      .rpc();

    const mid = await ctx.program.account.auctionConfig.fetch(auction);
    expect(mid.leaderBid.toString()).to.eq(bidAmountA.toString());
    expect(mid.commitCount).to.eq(2);
    expect(mid.revealCount).to.eq(2);

    await sleep(25000);

    await ctx.program.methods
      .settleAuction(auctionId)
      .accounts({
        authority: ctx.seller,
        auction,
        vault,
        sellerToken: sellerAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: bidPdaB, isSigner: false, isWritable: false },
        { pubkey: bidderBAta.address, isSigner: false, isWritable: true },
      ])
      .rpc();

    const settled = await ctx.program.account.auctionConfig.fetch(auction);
    expect(settled.phase).to.eq(2);
    expect(settled.winner.toBase58()).to.eq(ctx.bidderA.publicKey.toBase58());
    expect(settled.winningPrice.toString()).to.eq(bidAmountA.toString());

    const expectedRh = resultHashV1(
      auctionId,
      ctx.bidderA.publicKey,
      bidAmountA,
      2,
      2,
      ctx.mint
    );
    expect(Buffer.from(settled.resultHash).equals(expectedRh)).to.eq(true);
  });

  it("single bidder can win and settle", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const sellerAta = await ensureSellerAta(ctx);
    const aAta = await ensureBidderAta(ctx, ctx.bidderA.publicKey);
    await mintTokensTo(ctx, aAta.address, 200n * 10n ** 9n);

    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 4),
        new BN(now + 25),
        false
      )
      .accounts({
        seller: ctx.seller,
        tokenMint: ctx.mint,
        auction,
        runtime,
        vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const salt = Buffer.from("solo");
    const amt = new BN(50_000_000_000);
    const comm = Array.from(
      hashCommitment(auctionId, ctx.bidderA.publicKey, amt, salt)
    ) as number[];
    const bid = bidPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);

    await ctx.program.methods
      .commitBid(auctionId, comm)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bid,
        runtime,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();

    await sleep(5000);
    await ctx.program.methods
      .startReveal(auctionId)
      .accounts({ payer: ctx.seller, auction })
      .rpc();

    await ctx.program.methods
      .revealBid(auctionId, amt, salt)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bid,
        runtime,
        bidderToken: aAta.address,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.bidderA])
      .rpc();

    await sleep(25000);

    await ctx.program.methods
      .settleAuction(auctionId)
      .accounts({
        authority: ctx.seller,
        auction,
        vault,
        sellerToken: sellerAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const fin = await ctx.program.account.auctionConfig.fetch(auction);
    expect(fin.phase).to.eq(2);
    expect(fin.winner.toBase58()).to.eq(ctx.bidderA.publicKey.toBase58());
  });

  it("runtime mirror tracks commit_count after commits", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 120),
        new BN(now + 240),
        false
      )
      .accounts({
        seller: ctx.seller,
        tokenMint: ctx.mint,
        auction,
        runtime,
        vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const comm = Array.from(
      hashCommitment(auctionId, ctx.bidderA.publicKey, new BN(10), Buffer.from("s"))
    ) as number[];
    const bid = bidPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    await ctx.program.methods
      .commitBid(auctionId, comm)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bid,
        runtime,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();

    const rt = await ctx.program.account.auctionRuntime.fetch(runtime);
    expect(rt.commitCount).to.eq(1);
  });

  it("higher second bid becomes leader", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const aAta = await ensureBidderAta(ctx, ctx.bidderA.publicKey);
    const bAta = await ensureBidderAta(ctx, ctx.bidderB.publicKey);
    await mintTokensTo(ctx, aAta.address, 500n * 10n ** 9n);
    await mintTokensTo(ctx, bAta.address, 500n * 10n ** 9n);

    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 120),
        false
      )
      .accounts({
        seller: ctx.seller,
        tokenMint: ctx.mint,
        auction,
        runtime,
        vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const low = new BN(10_000_000_000);
    const high = new BN(500_000_000_000);
    const bidA = bidPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const bidB = bidPda(ctx.program.programId, auctionId, ctx.bidderB.publicKey);

    await ctx.program.methods
      .commitBid(
        auctionId,
        Array.from(
          hashCommitment(auctionId, ctx.bidderA.publicKey, low, Buffer.from("a"))
        ) as number[]
      )
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bid: bidA,
        runtime,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();

    await ctx.program.methods
      .commitBid(
        auctionId,
        Array.from(
          hashCommitment(auctionId, ctx.bidderB.publicKey, high, Buffer.from("b"))
        ) as number[]
      )
      .accounts({
        bidder: ctx.bidderB.publicKey,
        auction,
        bid: bidB,
        runtime,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderB])
      .rpc();

    await sleep(6000);
    await ctx.program.methods
      .startReveal(auctionId)
      .accounts({ payer: ctx.seller, auction })
      .rpc();

    await ctx.program.methods
      .revealBid(auctionId, low, Buffer.from("a"))
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bid: bidA,
        runtime,
        bidderToken: aAta.address,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.bidderA])
      .rpc();

    await ctx.program.methods
      .revealBid(auctionId, high, Buffer.from("b"))
      .accounts({
        bidder: ctx.bidderB.publicKey,
        auction,
        bid: bidB,
        runtime,
        bidderToken: bAta.address,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.bidderB])
      .rpc();

    const acct = await ctx.program.account.auctionConfig.fetch(auction);
    expect(acct.leaderBidder.toBase58()).to.eq(ctx.bidderB.publicKey.toBase58());
    expect(acct.leaderBid.toString()).to.eq(high.toString());
  });
});
