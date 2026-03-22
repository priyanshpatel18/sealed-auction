import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { join } from "path";
import type { SealedAuctionProgram } from "../target/types/sealed_auction_program";

const idl = JSON.parse(
  readFileSync(join(process.cwd(), "target/idl/sealed_auction_program.json"), "utf8")
) as SealedAuctionProgram;

export type AuctionFixture = {
  program: Program<SealedAuctionProgram>;
  provider: anchor.AnchorProvider;
  seller: PublicKey;
  payer: Keypair;
  bidderA: Keypair;
  bidderB: Keypair;
  bidderC: Keypair;
};

let cached: AuctionFixture | null = null;

export async function getFixture(): Promise<AuctionFixture> {
  if (cached) return cached;
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
  const bidderC = Keypair.generate();

  // Shared keypairs run the whole suite; fund enough for many commits/reveals + fees.
  for (const kp of [bidderA, bidderB, bidderC]) {
    const sig = await provider.connection.requestAirdrop(
      kp.publicKey,
      120 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  }

  cached = {
    program,
    provider,
    seller,
    payer,
    bidderA,
    bidderB,
    bidderC,
  };
  return cached;
}

export function vaultPda(programId: PublicKey, auctionId: anchor.BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), auctionId.toArrayLike(Buffer, "le", 8)],
    programId
  )[0];
}

export function auctionPdas(programId: PublicKey, auctionId: anchor.BN) {
  const aid = auctionId.toArrayLike(Buffer, "le", 8);
  const auction = PublicKey.findProgramAddressSync(
    [Buffer.from("auction"), aid],
    programId
  )[0];
  const runtime = PublicKey.findProgramAddressSync(
    [Buffer.from("runtime"), aid],
    programId
  )[0];
  const vault = vaultPda(programId, auctionId);
  return { auction, runtime, vault };
}

export function bidPda(programId: PublicKey, auctionId: anchor.BN, bidder: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("bid"),
      auctionId.toArrayLike(Buffer, "le", 8),
      bidder.toBuffer(),
    ],
    programId
  )[0];
}

export function bidCipherPda(programId: PublicKey, auctionId: anchor.BN, bidder: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("bid_cipher"),
      auctionId.toArrayLike(Buffer, "le", 8),
      bidder.toBuffer(),
    ],
    programId
  )[0];
}

/** Fund the auction vault with native SOL (e.g. private-mode demos). */
export async function fundVaultSol(
  f: AuctionFixture,
  vault: PublicKey,
  lamports: bigint | number
) {
  const lam = typeof lamports === "bigint" ? Number(lamports) : lamports;
  const ix = SystemProgram.transfer({
    fromPubkey: f.payer.publicKey,
    toPubkey: vault,
    lamports: lam,
  });
  const tx = new Transaction().add(ix);
  await sendAndConfirmTransaction(f.provider.connection, tx, [f.payer]);
}

export { SystemProgram };
