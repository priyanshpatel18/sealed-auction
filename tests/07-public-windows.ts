import { expect } from "chai";
import BN from "bn.js";
import {
  assertAnchorError,
  hashCommitment,
  sleep,
  uniqueAuctionId,
} from "./test-utils";
import {
  auctionPdas,
  bidPda,
  ensureBidderAta,
  getFixture,
  mintTokensTo,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SystemProgram,
  TOKEN_PROGRAM_ID,
} from "./fixture";

describe("public mode — time windows", () => {
  it("commit fails after commit_end passes (window uses strict < commit_end)", async () => {
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
        new BN(now - 120),
        new BN(now + 1),
        new BN(now + 600),
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

    await sleep(2500);

    const comm = Array.from(
      hashCommitment(auctionId, ctx.bidderA.publicKey, new BN(10), Buffer.from("s"))
    ) as number[];
    const bid = bidPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);

    try {
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
      expect.fail("expected CommitWindowClosed");
    } catch (e) {
      assertAnchorError(e, "CommitWindowClosed");
    }
  });

  it("reveal_bid after reveal_end fails (RevealWindowClosed)", async function () {
    this.timeout(120_000);
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const aAta = await ensureBidderAta(ctx, ctx.bidderA.publicKey);
    await mintTokensTo(ctx, aAta.address, 500n * 10n ** 9n);

    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 8),
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

    const salt = Buffer.from("s");
    const amt = new BN(100_000_000_000);
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

    await sleep(6000);
    await ctx.program.methods
      .startReveal(auctionId)
      .accounts({ payer: ctx.seller, auction })
      .rpc();

    await sleep(12000);

    try {
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
      expect.fail("expected RevealWindowClosed");
    } catch (e) {
      assertAnchorError(e, "RevealWindowClosed");
    }
  });

  it("reveal_bid rejects before start_reveal (phase still Bidding)", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const aAta = await ensureBidderAta(ctx, ctx.bidderA.publicKey);
    await mintTokensTo(ctx, aAta.address, 500n * 10n ** 9n);

    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 60),
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

    const salt = Buffer.from("s");
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

    try {
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
      expect.fail("expected AuctionPhaseMismatch");
    } catch (e) {
      assertAnchorError(e, "AuctionPhaseMismatch");
    }
  });
});
