import { expect } from "chai";
import BN from "bn.js";
import {
  aggregateCiphertextDigestsV1,
  assertAnchorError,
  ciphertextDigestV1,
  sleep,
  uniqueAuctionId,
} from "./test-utils";
import {
  auctionPdas,
  bidCipherPda,
  ensureSellerAta,
  getFixture,
  mintTokensTo,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SystemProgram,
  TOKEN_PROGRAM_ID,
} from "./fixture";

describe("private mode — negative & invariants", function () {
  this.timeout(240_000);
  it("submit_encrypted_bid rejects public auction", async () => {
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

    const bc = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    try {
      await ctx.program.methods
        .submitEncryptedBid(auctionId, Buffer.from("x"))
        .accounts({
          bidder: ctx.bidderA.publicKey,
          auction,
          bidCipher: bc,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.bidderA])
        .rpc();
      expect.fail("expected PrivateModeMismatch");
    } catch (e) {
      assertAnchorError(e, "PrivateModeMismatch");
    }
  });

  it("submit_encrypted_bid rejects after commit_end", async () => {
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
        new BN(now - 400),
        new BN(now - 200),
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

    const bc = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    try {
      await ctx.program.methods
        .submitEncryptedBid(auctionId, Buffer.from("late"))
        .accounts({
          bidder: ctx.bidderA.publicKey,
          auction,
          bidCipher: bc,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.bidderA])
        .rpc();
      expect.fail("expected CommitWindowClosed");
    } catch (e) {
      assertAnchorError(e, "CommitWindowClosed");
    }
  });

  it("submit_encrypted_bid rejects ciphertext > 256 bytes", async () => {
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

    const bc = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    try {
      await ctx.program.methods
        .submitEncryptedBid(auctionId, Buffer.alloc(257, 1))
        .accounts({
          bidder: ctx.bidderA.publicKey,
          auction,
          bidCipher: bc,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.bidderA])
        .rpc();
      expect.fail("expected CiphertextTooLong");
    } catch (e) {
      assertAnchorError(e, "CiphertextTooLong");
    }
  });

  it("compute_winner_private rejects before reveal_end (SettlementTooEarly)", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const bcA = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 4),
        new BN(now + 10_000),
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

    const ct = Buffer.from("x");
    await ctx.program.methods
      .submitEncryptedBid(auctionId, ct)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bidCipher: bcA,
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

    try {
      await ctx.program.methods
        .computeWinnerPrivate(
          auctionId,
          ctx.bidderA.publicKey,
          new BN(100),
          Array.from(agg) as number[]
        )
        .accounts({ payer: ctx.seller, auction })
        .remainingAccounts([{ pubkey: bcA, isSigner: false, isWritable: false }])
        .rpc();
      expect.fail("expected SettlementTooEarly");
    } catch (e) {
      assertAnchorError(e, "SettlementTooEarly");
    }
  });

  it("compute_winner_private rejects winning_price == 0", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const bcA = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 25),
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

    const ct = Buffer.from("z");
    await ctx.program.methods
      .submitEncryptedBid(auctionId, ct)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bidCipher: bcA,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();

    await sleep(26000);

    const agg = aggregateCiphertextDigestsV1([
      {
        bidder: ctx.bidderA.publicKey,
        digest: ciphertextDigestV1(auctionId, ctx.bidderA.publicKey, ct),
      },
    ]);

    try {
      await ctx.program.methods
        .computeWinnerPrivate(
          auctionId,
          ctx.bidderA.publicKey,
          new BN(0),
          Array.from(agg) as number[]
        )
        .accounts({ payer: ctx.seller, auction })
        .remainingAccounts([{ pubkey: bcA, isSigner: false, isWritable: false }])
        .rpc();
      expect.fail("expected BidOutOfRange");
    } catch (e) {
      assertAnchorError(e, "BidOutOfRange");
    }
  });

  it("compute_winner_private rejects wrong aggregate (AggregateMismatch)", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const bcA = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const bcB = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderB.publicKey);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 25),
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

    const ctA = Buffer.from("a");
    const ctB = Buffer.from("b");
    await ctx.program.methods
      .submitEncryptedBid(auctionId, ctA)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bidCipher: bcA,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();
    await ctx.program.methods
      .submitEncryptedBid(auctionId, ctB)
      .accounts({
        bidder: ctx.bidderB.publicKey,
        auction,
        bidCipher: bcB,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderB])
      .rpc();

    await sleep(26000);

    const wrong = Buffer.alloc(32, 9);

    try {
      await ctx.program.methods
        .computeWinnerPrivate(
          auctionId,
          ctx.bidderA.publicKey,
          new BN(100),
          Array.from(wrong) as number[]
        )
        .accounts({ payer: ctx.seller, auction })
        .remainingAccounts([
          { pubkey: bcA, isSigner: false, isWritable: false },
          { pubkey: bcB, isSigner: false, isWritable: false },
        ])
        .rpc();
      expect.fail("expected AggregateMismatch");
    } catch (e) {
      assertAnchorError(e, "AggregateMismatch");
    }
  });

  it("compute_winner_private rejects wrong remaining count (AggregateMismatch)", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const bcA = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const bcB = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderB.publicKey);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 5),
        new BN(now + 25),
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

    const ctA = Buffer.from("a");
    const ctB = Buffer.from("b");
    await ctx.program.methods
      .submitEncryptedBid(auctionId, ctA)
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bidCipher: bcA,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();
    await ctx.program.methods
      .submitEncryptedBid(auctionId, ctB)
      .accounts({
        bidder: ctx.bidderB.publicKey,
        auction,
        bidCipher: bcB,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderB])
      .rpc();

    await sleep(26000);

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

    try {
      await ctx.program.methods
        .computeWinnerPrivate(
          auctionId,
          ctx.bidderA.publicKey,
          new BN(100),
          Array.from(agg) as number[]
        )
        .accounts({ payer: ctx.seller, auction })
        .remainingAccounts([{ pubkey: bcA, isSigner: false, isWritable: false }])
        .rpc();
      expect.fail("expected AggregateMismatch");
    } catch (e) {
      assertAnchorError(e, "AggregateMismatch");
    }
  });

  it("settle_private rejects before compute (WinnerNotComputed)", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const sellerAta = await ensureSellerAta(ctx);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 120),
        new BN(now + 240),
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

    try {
      await ctx.program.methods
        .settlePrivate(auctionId)
        .accounts({
          authority: ctx.seller,
          auction,
          vault,
          sellerToken: sellerAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail("expected WinnerNotComputed");
    } catch (e) {
      assertAnchorError(e, "WinnerNotComputed");
    }
  });

  it("settle_private rejects public auction", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const sellerAta = await ensureSellerAta(ctx);
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
        .settlePrivate(auctionId)
        .accounts({
          authority: ctx.seller,
          auction,
          vault,
          sellerToken: sellerAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail("expected PrivateModeMismatch");
    } catch (e) {
      assertAnchorError(e, "PrivateModeMismatch");
    }
  });

  it("duplicate encrypted bid fails (account init)", async () => {
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

    const bc = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    await ctx.program.methods
      .submitEncryptedBid(auctionId, Buffer.from("one"))
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bidCipher: bc,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();

    let failed = false;
    try {
      await ctx.program.methods
        .submitEncryptedBid(auctionId, Buffer.from("two"))
        .accounts({
          bidder: ctx.bidderA.publicKey,
          auction,
          bidCipher: bc,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.bidderA])
        .rpc();
    } catch {
      failed = true;
    }
    expect(failed).to.eq(true);
  });

  it("max length ciphertext (256) accepted", async () => {
    const ctx = await getFixture();
    const auctionId = uniqueAuctionId();
    const { auction, runtime, vault } = auctionPdas(
      ctx.program.programId,
      auctionId,
      ctx.mint
    );
    const bc = bidCipherPda(ctx.program.programId, auctionId, ctx.bidderA.publicKey);
    const now = Math.floor(Date.now() / 1000);
    await ctx.program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 120),
        new BN(now + 240),
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

    await ctx.program.methods
      .submitEncryptedBid(auctionId, Buffer.alloc(256, 3))
      .accounts({
        bidder: ctx.bidderA.publicKey,
        auction,
        bidCipher: bc,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.bidderA])
      .rpc();

    const st = await ctx.program.account.bidCiphertext.fetch(bc);
    expect(st.ciphertextLen).to.eq(256);
  });
});
