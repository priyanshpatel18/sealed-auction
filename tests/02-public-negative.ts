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
  getFixture,
  SystemProgram,
} from "./fixture";

/** Reveal amount in cases below (1 SOL). 100 SOL bids exhaust shared fixture keypairs across the suite. */
const CASE_BID_LAMPORTS = 1_000_000_000;

describe("public mode — negative & invariants", function () {
  this.timeout(240_000);
  const f = async () => getFixture();

  it("initialize rejects bidding_start >= commit_end", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    try {
      await ctx.program.methods
        .initializeAuction(
          auctionId,
          new BN(now + 10),
          new BN(now + 5),
          new BN(now + 20),
          false,
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
      expect.fail("expected CommitWindowClosed");
    } catch (e) {
      assertAnchorError(e, "CommitWindowClosed");
    }
  });

  it("initialize rejects commit_end >= reveal_end", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    try {
      await ctx.program.methods
        .initializeAuction(
          auctionId,
          new BN(now - 2),
          new BN(now + 30),
          new BN(now + 20),
          false,
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
      expect.fail("expected RevealWindowClosed");
    } catch (e) {
      assertAnchorError(e, "RevealWindowClosed");
    }
  });

  it("commit_bid rejects private_mode auction", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 300),
        new BN(now + 600),
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
      expect.fail("expected PrivateModeMismatch");
    } catch (e) {
      assertAnchorError(e, "PrivateModeMismatch");
    }
  });

  it("commit_bid rejects after commit_end", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 400),
        new BN(now - 200),
        new BN(now + 600),
        false,
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

  it("commit_bid rejects before bidding_start", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now + 120),
        new BN(now + 240),
        new BN(now + 360),
        false,
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

  it("start_reveal rejects before commit_end", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 120),
        new BN(now + 240),
        false,
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

    try {
      await ctx.program.methods
        .startReveal(auctionId)
        .accounts({ payer: ctx.seller, auction })
        .rpc();
      expect.fail("expected RevealNotAllowed");
    } catch (e) {
      assertAnchorError(e, "RevealNotAllowed");
    }
  });

  it("start_reveal rejects private auction", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 400),
        new BN(now - 200),
        new BN(now + 600),
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

    try {
      await ctx.program.methods
        .startReveal(auctionId)
        .accounts({ payer: ctx.seller, auction })
        .rpc();
      expect.fail("expected PrivateModeMismatch");
    } catch (e) {
      assertAnchorError(e, "PrivateModeMismatch");
    }
  });

  it("reveal_bid rejects bid_amount zero", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 120),
        false,
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

    const salt = Buffer.from("s");
    const amt = new BN(100);
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

    try {
      await ctx.program.methods
        .revealBid(auctionId, new BN(0), salt)
        .accounts({
          bidder: ctx.bidderA.publicKey,
          auction,
          bid,
          runtime,
          vault,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.bidderA])
        .rpc();
      expect.fail("expected BidOutOfRange");
    } catch (e) {
      assertAnchorError(e, "BidOutOfRange");
    }
  });

  it("reveal_bid rejects wrong salt (commitment mismatch)", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 120),
        false,
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

    const salt = Buffer.from("good");
    const amt = new BN(200_000_000);
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

    try {
      await ctx.program.methods
        .revealBid(auctionId, amt, Buffer.from("bad"))
        .accounts({
          bidder: ctx.bidderA.publicKey,
          auction,
          bid,
          runtime,
          vault,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.bidderA])
        .rpc();
      expect.fail("expected CommitmentMismatch");
    } catch (e) {
      assertAnchorError(e, "CommitmentMismatch");
    }
  });

  it("reveal_bid rejects salt longer than MAX_SALT_LEN (65)", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const longSalt = Buffer.alloc(65, 1);

    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 120),
        false,
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

    const amt = new BN(50_000_000);
    const comm = Array.from(
      hashCommitment(auctionId, ctx.bidderA.publicKey, amt, longSalt.subarray(0, 64))
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

    try {
      await ctx.program.methods
        .revealBid(auctionId, amt, longSalt)
        .accounts({
          bidder: ctx.bidderA.publicKey,
          auction,
          bid,
          runtime,
          vault,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.bidderA])
        .rpc();
      expect.fail("expected SaltTooLong");
    } catch (e) {
      assertAnchorError(e, "SaltTooLong");
    }
  });

  it("settle_auction rejects private_mode", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 300),
        new BN(now + 600),
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

    try {
      await ctx.program.methods
        .settleAuction(auctionId)
        .accounts({
          authority: ctx.seller,
          auction,
          vault,
        seller: ctx.seller,
        systemProgram: SystemProgram.programId,
      }).rpc();
      expect.fail("expected PrivateModeMismatch");
    } catch (e) {
      assertAnchorError(e, "PrivateModeMismatch");
    }
  });

  it("settle_auction rejects SettlementTooEarly", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 4),
        new BN(now + 10_000),
        false,
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

    const salt = Buffer.from("s");
    const amt = new BN(CASE_BID_LAMPORTS);
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
          vault,
          systemProgram: SystemProgram.programId,
        })
      .signers([ctx.bidderA])
      .rpc();

    try {
      await ctx.program.methods
        .settleAuction(auctionId)
        .accounts({
          authority: ctx.seller,
          auction,
          vault,
        seller: ctx.seller,
        systemProgram: SystemProgram.programId,
      }).rpc();
      expect.fail("expected SettlementTooEarly");
    } catch (e) {
      assertAnchorError(e, "SettlementTooEarly");
    }
  });

  it("settle_auction rejects when no reveals (NoRevealedBids)", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 500),
        new BN(now - 400),
        new BN(now - 200),
        false,
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

    await ctx.program.methods
      .startReveal(auctionId)
      .accounts({ payer: ctx.seller, auction })
      .rpc();

    try {
      await ctx.program.methods
        .settleAuction(auctionId)
        .accounts({
          authority: ctx.seller,
          auction,
          vault,
        seller: ctx.seller,
        systemProgram: SystemProgram.programId,
      }).rpc();
      expect.fail("expected NoRevealedBids");
    } catch (e) {
      assertAnchorError(e, "NoRevealedBids");
    }
  });

  it("duplicate commit from same bidder fails (account init)", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 120),
        new BN(now + 240),
        false,
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

    let failed = false;
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
    } catch {
      failed = true;
    }
    expect(failed).to.eq(true);
  });

  it("second reveal from same bidder fails (BidAlreadyRevealed)", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 120),
        false,
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

    const salt = Buffer.from("s");
    const amt = new BN(CASE_BID_LAMPORTS);
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

    await ctx.program.methods
      .revealBid(auctionId, amt, salt)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bid,
        runtime,
          vault,
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
          vault,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.bidderA])
        .rpc();
      expect.fail("expected BidAlreadyRevealed");
    } catch (e) {
      assertAnchorError(e, "BidAlreadyRevealed");
    }
  });

  it("tie-break: equal bid does not replace leader (strict >)", async () => {
    const ctx = await f();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(ctx.program.programId, auctionId);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 120),
        false,
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

    const amt = new BN(CASE_BID_LAMPORTS);
    const saltA = Buffer.from("a");
    const saltB = Buffer.from("b");
    const commA = Array.from(
      hashCommitment(auctionId, ctx.bidderA.publicKey, amt, saltA)
    ) as number[];
    const commB = Array.from(
      hashCommitment(auctionId, ctx.bidderB.publicKey, amt, saltB)
    ) as number[];

    const bidA = bidPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const bidB = bidPda(ctx.program.programId, auctionId, ctx.bidderB.publicKey);

    await ctx.program.methods
      .commitBid(auctionId, commA)
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
      .commitBid(auctionId, commB)
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
      .revealBid(auctionId, amt, saltA)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bid: bidA,
        runtime,
          vault,
          systemProgram: SystemProgram.programId,
        })
      .signers([ctx.bidderA])
      .rpc();

    await ctx.program.methods
      .revealBid(auctionId, amt, saltB)
      .accounts({
        bidder: ctx.bidderB.publicKey,
        auction,
        bid: bidB,
        runtime,
          vault,
          systemProgram: SystemProgram.programId,
        })
      .signers([ctx.bidderB])
      .rpc();

    const acct = await ctx.program.account.auctionConfig.fetch(auction);
    expect(acct.leaderBidder.toBase58()).to.eq(ctx.bidderA.publicKey.toBase58());
  });
});
