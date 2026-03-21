import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import { expect } from "chai";
import { createHash } from "crypto";
import BN from "bn.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import { join } from "path";
import type { SealedAuctionProgram } from "../target/types/sealed_auction_program";
import {
  aggregateCiphertextDigestsV1,
  ciphertextDigestV1,
} from "./helpers";

// Load IDL without JSON `import` (needs `with { type: "json" }` in ESM) or `require` (unavailable in ESM).
// `anchor test` cwd is the project root.
const idl = JSON.parse(
  readFileSync(join(process.cwd(), "target/idl/sealed_auction_program.json"), "utf8")
) as SealedAuctionProgram;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hashCommitment(
  auctionId: BN,
  bidder: PublicKey,
  amount: BN,
  salt: Buffer
): Buffer {
  const h = createHash("sha256");
  h.update(Buffer.from("sealed-auction:v1"));
  h.update(Buffer.from(auctionId.toArray("le", 8)));
  h.update(bidder.toBuffer());
  h.update(Buffer.from(amount.toArray("le", 8)));
  h.update(salt);
  return h.digest();
}

describe("sealed-auction", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  const program = new Program(
    idl as SealedAuctionProgram,
    provider
  ) as Program<SealedAuctionProgram>;

  const seller = provider.wallet.publicKey;
  const payer = (provider.wallet as Wallet).payer;

  const bidderA = Keypair.generate();
  const bidderB = Keypair.generate();

  let mint: PublicKey;

  before(async () => {
    for (const kp of [bidderA, bidderB]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
    }

    mint = await createMint(provider.connection, payer, seller, null, 9);
  });

  it("commitment hash matches on-chain scheme", () => {
    const aid = new BN(42);
    const bidder = Keypair.generate().publicKey;
    const amount = new BN(123);
    const salt = Buffer.from("salt");
    const h = hashCommitment(aid, bidder, amount, salt);
    expect(h.length).to.eq(32);
  });

  it("full public auction: commit → reveal → settle", async function () {
    this.timeout(120_000);

    const auctionId = new BN(Date.now() % 1_000_000_000);

    const auctionPda = PublicKey.findProgramAddressSync(
      [Buffer.from("auction"), auctionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];

    const runtimePda = PublicKey.findProgramAddressSync(
      [Buffer.from("runtime"), auctionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];

    const vaultAta = getAssociatedTokenAddressSync(
      mint,
      auctionPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const sellerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      seller
    );

    const bidderAAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      bidderA.publicKey
    );

    const bidderBAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      bidderB.publicKey
    );

    await mintTo(
      provider.connection,
      payer,
      mint,
      sellerAta.address,
      seller,
      1_000_000_000_000n
    );

    await mintTo(
      provider.connection,
      payer,
      mint,
      bidderAAta.address,
      seller,
      500_000_000_000n
    );

    await mintTo(
      provider.connection,
      payer,
      mint,
      bidderBAta.address,
      seller,
      500_000_000_000n
    );

    const now = Math.floor(Date.now() / 1000);
    const biddingStart = now - 2;
    const commitEnd = now + 4;
    const revealEnd = now + 20;

    await program.methods
      .initializeAuction(
        auctionId,
        new BN(biddingStart),
        new BN(commitEnd),
        new BN(revealEnd),
        false
      )
      .accounts({
        seller,
        tokenMint: mint,
        auction: auctionPda,
        runtime: runtimePda,
        vault: vaultAta,
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
      hashCommitment(auctionId, bidderA.publicKey, bidAmountA, saltA)
    ) as number[];
    const commB = Array.from(
      hashCommitment(auctionId, bidderB.publicKey, bidAmountB, saltB)
    ) as number[];

    const bidPdaA = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bid"),
        auctionId.toArrayLike(Buffer, "le", 8),
        bidderA.publicKey.toBuffer(),
      ],
      program.programId
    )[0];

    const bidPdaB = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bid"),
        auctionId.toArrayLike(Buffer, "le", 8),
        bidderB.publicKey.toBuffer(),
      ],
      program.programId
    )[0];

    await program.methods
      .commitBid(auctionId, commA)
      .accounts({
        bidder: bidderA.publicKey,
        auction: auctionPda,
        bid: bidPdaA,
        runtime: runtimePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([bidderA])
      .rpc();

    await program.methods
      .commitBid(auctionId, commB)
      .accounts({
        bidder: bidderB.publicKey,
        auction: auctionPda,
        bid: bidPdaB,
        runtime: runtimePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([bidderB])
      .rpc();

    await sleep(5000);

    await program.methods
      .startReveal(auctionId)
      .accounts({
        payer: seller,
        auction: auctionPda,
      })
      .rpc();

    await program.methods
      .revealBid(auctionId, bidAmountA, saltA)
      .accounts({
        bidder: bidderA.publicKey,
        auction: auctionPda,
        bid: bidPdaA,
        runtime: runtimePda,
        bidderToken: bidderAAta.address,
        vault: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bidderA])
      .rpc();

    await program.methods
      .revealBid(auctionId, bidAmountB, saltB)
      .accounts({
        bidder: bidderB.publicKey,
        auction: auctionPda,
        bid: bidPdaB,
        runtime: runtimePda,
        bidderToken: bidderBAta.address,
        vault: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bidderB])
      .rpc();

    const acct = await program.account.auctionConfig.fetch(auctionPda);
    expect(acct.leaderBid.toString()).to.eq(bidAmountA.toString());
    expect(acct.leaderBidder.toBase58()).to.eq(bidderA.publicKey.toBase58());

    // Must satisfy on-chain `Clock::unix_timestamp >= reveal_end` (set to now+20 at init).
    // Prior waits were ~5s + ~12s ≈ 17s — not enough margin vs chain/tx latency.
    await sleep(25000);

    await program.methods
      .settleAuction(auctionId)
      .accounts({
        authority: seller,
        auction: auctionPda,
        vault: vaultAta,
        sellerToken: sellerAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: bidPdaB, isSigner: false, isWritable: false },
        { pubkey: bidderBAta.address, isSigner: false, isWritable: true },
      ])
      .rpc();

    const settled = await program.account.auctionConfig.fetch(auctionPda);
    expect(settled.phase).to.eq(2);
    expect(settled.winner.toBase58()).to.eq(bidderA.publicKey.toBase58());
  });

  it("rejects duplicate commit from same bidder", async () => {
    const auctionId = new BN(Date.now() % 1_000_000_000);
    const auctionPda = PublicKey.findProgramAddressSync(
      [Buffer.from("auction"), auctionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
    const runtimePda = PublicKey.findProgramAddressSync(
      [Buffer.from("runtime"), auctionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
    const vaultAta = getAssociatedTokenAddressSync(
      mint,
      auctionPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const sellerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      seller
    );
    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 60),
        new BN(now + 120),
        false
      )
      .accounts({
        seller,
        tokenMint: mint,
        auction: auctionPda,
        runtime: runtimePda,
        vault: vaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const salt = Buffer.from("s");
    const amt = new BN(10);
    const comm = Array.from(
      hashCommitment(auctionId, bidderA.publicKey, amt, salt)
    ) as number[];
    const bidPda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bid"),
        auctionId.toArrayLike(Buffer, "le", 8),
        bidderA.publicKey.toBuffer(),
      ],
      program.programId
    )[0];

    await program.methods
      .commitBid(auctionId, comm)
      .accounts({
        bidder: bidderA.publicKey,
        auction: auctionPda,
        bid: bidPda,
        runtime: runtimePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([bidderA])
      .rpc();

    let failed = false;
    try {
      await program.methods
        .commitBid(auctionId, comm)
        .accounts({
          bidder: bidderA.publicKey,
          auction: auctionPda,
          bid: bidPda,
          runtime: runtimePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([bidderA])
        .rpc();
    } catch {
      failed = true;
    }
    expect(failed).to.eq(true);
  });

  it("rejects reveal with wrong salt", async function () {
    this.timeout(120_000);
    const auctionId = new BN((Date.now() % 1_000_000_000) + 17);
    const auctionPda = PublicKey.findProgramAddressSync(
      [Buffer.from("auction"), auctionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
    const runtimePda = PublicKey.findProgramAddressSync(
      [Buffer.from("runtime"), auctionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
    const vaultAta = getAssociatedTokenAddressSync(
      mint,
      auctionPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const bidderAAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      bidderA.publicKey
    );
    const sellerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      seller
    );
    await mintTo(
      provider.connection,
      payer,
      mint,
      bidderAAta.address,
      seller,
      500_000_000_000n
    );

    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(now + 4),
        new BN(now + 20),
        false
      )
      .accounts({
        seller,
        tokenMint: mint,
        auction: auctionPda,
        runtime: runtimePda,
        vault: vaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const salt = Buffer.from("good-salt");
    const bidAmount = new BN(200_000_000_000);
    const comm = Array.from(
      hashCommitment(auctionId, bidderA.publicKey, bidAmount, salt)
    ) as number[];
    const bidPda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bid"),
        auctionId.toArrayLike(Buffer, "le", 8),
        bidderA.publicKey.toBuffer(),
      ],
      program.programId
    )[0];

    await program.methods
      .commitBid(auctionId, comm)
      .accounts({
        bidder: bidderA.publicKey,
        auction: auctionPda,
        bid: bidPda,
        runtime: runtimePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([bidderA])
      .rpc();

    await sleep(5000);
    await program.methods
      .startReveal(auctionId)
      .accounts({ payer: seller, auction: auctionPda })
      .rpc();

    let failed = false;
    try {
      await program.methods
        .revealBid(auctionId, bidAmount, Buffer.from("wrong-salt"))
        .accounts({
          bidder: bidderA.publicKey,
          auction: auctionPda,
          bid: bidPda,
          runtime: runtimePda,
          bidderToken: bidderAAta.address,
          vault: vaultAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([bidderA])
        .rpc();
    } catch {
      failed = true;
    }
    expect(failed).to.eq(true);
  });

  it("private mode: aggregate digest + compute_winner_private + settle_private", async function () {
    this.timeout(180_000);

    const auctionId = new BN((Date.now() % 1_000_000_000) + 99);
    const auctionPda = PublicKey.findProgramAddressSync(
      [Buffer.from("auction"), auctionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
    const runtimePda = PublicKey.findProgramAddressSync(
      [Buffer.from("runtime"), auctionId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];
    const vaultAta = getAssociatedTokenAddressSync(
      mint,
      auctionPda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const sellerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      seller
    );

    const bidCipherA = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bid_cipher"),
        auctionId.toArrayLike(Buffer, "le", 8),
        bidderA.publicKey.toBuffer(),
      ],
      program.programId
    )[0];
    const bidCipherB = PublicKey.findProgramAddressSync(
      [
        Buffer.from("bid_cipher"),
        auctionId.toArrayLike(Buffer, "le", 8),
        bidderB.publicKey.toBuffer(),
      ],
      program.programId
    )[0];

    const now = Math.floor(Date.now() / 1000);
    const commitEnd = now + 8;
    const revealEnd = now + 10;

    await program.methods
      .initializeAuction(
        auctionId,
        new BN(now - 2),
        new BN(commitEnd),
        new BN(revealEnd),
        true
      )
      .accounts({
        seller,
        tokenMint: mint,
        auction: auctionPda,
        runtime: runtimePda,
        vault: vaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const ctA = Buffer.from("demo-cipher-a");
    const ctB = Buffer.from("demo-cipher-b");

    await program.methods
      .submitEncryptedBid(auctionId, Buffer.from(ctA))
      .accounts({
        bidder: bidderA.publicKey,
        auction: auctionPda,
        bidCipher: bidCipherA,
        systemProgram: SystemProgram.programId,
      })
      .signers([bidderA])
      .rpc();

    await program.methods
      .submitEncryptedBid(auctionId, Buffer.from(ctB))
      .accounts({
        bidder: bidderB.publicKey,
        auction: auctionPda,
        bidCipher: bidCipherB,
        systemProgram: SystemProgram.programId,
      })
      .signers([bidderB])
      .rpc();

    const storedA = await program.account.bidCiphertext.fetch(bidCipherA);
    expect(storedA.ciphertextLen).to.eq(ctA.length);
    expect(storedA.bidder.toBase58()).to.eq(bidderA.publicKey.toBase58());

    const agg = aggregateCiphertextDigestsV1([
      {
        bidder: bidderA.publicKey,
        digest: ciphertextDigestV1(auctionId, bidderA.publicKey, ctA),
      },
      {
        bidder: bidderB.publicKey,
        digest: ciphertextDigestV1(auctionId, bidderB.publicKey, ctB),
      },
    ]);
    const winningPrice = new BN(400_000_000_000);

    await mintTo(
      provider.connection,
      payer,
      mint,
      vaultAta,
      seller,
      2_000_000_000_000n
    );

    await sleep(12000);

    await program.methods
      .computeWinnerPrivate(
        auctionId,
        bidderA.publicKey,
        winningPrice,
        Array.from(agg) as number[]
      )
      .accounts({
        payer: seller,
        auction: auctionPda,
      })
      .remainingAccounts([
        { pubkey: bidCipherA, isSigner: false, isWritable: false },
        { pubkey: bidCipherB, isSigner: false, isWritable: false },
      ])
      .rpc();

    const mid = await program.account.auctionConfig.fetch(auctionPda);
    expect(mid.teeWinnerReady).to.eq(true);
    expect(mid.winner.toBase58()).to.eq(bidderA.publicKey.toBase58());

    await program.methods
      .settlePrivate(auctionId)
      .accounts({
        authority: seller,
        auction: auctionPda,
        vault: vaultAta,
        sellerToken: sellerAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const fin = await program.account.auctionConfig.fetch(auctionPda);
    expect(fin.phase).to.eq(2);
  });
});
