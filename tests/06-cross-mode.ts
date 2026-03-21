import { expect } from "chai";
import BN from "bn.js";
import { assertAnchorError, hashCommitment, uniqueAuctionId } from "./test-utils";
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

describe("cross-mode & phase guards", () => {
  it("reveal_bid fails without bid PDA (private auctions have no BidCommitment)", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const aAta = await ensureBidderAta(ctx, ctx.bidderA.publicKey);
    await mintTokensTo(ctx, aAta.address, 100n * 10n ** 9n);

    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 500),
        new BN(now - 400),
        new BN(now + 600),
        true
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

    const bid = bidPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    try {
      await ctx.program.methods
        .revealBid(auctionId, new BN(100), Buffer.from("s"))
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
      expect.fail("expected failure");
    } catch (e) {
      assertAnchorError(e, "AccountNotInitialized");
    }
  });

  it("commit_bid rejects after phase moved to Reveal (AuctionPhaseMismatch)", async () => {
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
        new BN(now - 500),
        new BN(now - 400),
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

    await ctx.program.methods
      .startReveal(auctionId)
      .accounts({ payer: ctx.seller, auction })
      .rpc();

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
      expect.fail("expected AuctionPhaseMismatch");
    } catch (e) {
      assertAnchorError(e, "AuctionPhaseMismatch");
    }
  });

  it("start_reveal rejects when already in Reveal phase", async () => {
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
        new BN(now - 500),
        new BN(now - 400),
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

    await ctx.program.methods
      .startReveal(auctionId)
      .accounts({ payer: ctx.seller, auction })
      .rpc();

    try {
      await ctx.program.methods
        .startReveal(auctionId)
        .accounts({ payer: ctx.seller, auction })
        .rpc();
      expect.fail("expected AuctionPhaseMismatch");
    } catch (e) {
      assertAnchorError(e, "AuctionPhaseMismatch");
    }
  });

  it("compute_winner_private rejects on public auction", async () => {
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

    try {
      await ctx.program.methods
        .computeWinnerPrivate(
          auctionId,
          ctx.bidderA.publicKey,
          new BN(1),
          Array.from(Buffer.alloc(32, 0)) as number[]
        )
        .accounts({ payer: ctx.seller, auction })
        .rpc();
      expect.fail("expected PrivateModeMismatch");
    } catch (e) {
      assertAnchorError(e, "PrivateModeMismatch");
    }
  });
});
