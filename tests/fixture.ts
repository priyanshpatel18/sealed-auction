import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
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
  mint: PublicKey;
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

  for (const kp of [bidderA, bidderB, bidderC]) {
    const sig = await provider.connection.requestAirdrop(
      kp.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  }

  const mint = await createMint(provider.connection, payer, seller, null, 9);

  cached = {
    program,
    provider,
    seller,
    payer,
    bidderA,
    bidderB,
    bidderC,
    mint,
  };
  return cached;
}

export function auctionPdas(
  programId: PublicKey,
  auctionId: anchor.BN,
  mint: PublicKey
) {
  const aid = auctionId.toArrayLike(Buffer, "le", 8);
  const auction = PublicKey.findProgramAddressSync(
    [Buffer.from("auction"), aid],
    programId
  )[0];
  const runtime = PublicKey.findProgramAddressSync(
    [Buffer.from("runtime"), aid],
    programId
  )[0];
  const vault = getAssociatedTokenAddressSync(
    mint,
    auction,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
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

export async function ensureSellerAta(f: AuctionFixture) {
  return getOrCreateAssociatedTokenAccount(
    f.provider.connection,
    f.payer,
    f.mint,
    f.seller
  );
}

export async function ensureBidderAta(f: AuctionFixture, bidder: PublicKey) {
  return getOrCreateAssociatedTokenAccount(
    f.provider.connection,
    f.payer,
    f.mint,
    bidder
  );
}

export async function mintTokensTo(
  f: AuctionFixture,
  dest: PublicKey,
  amount: bigint
) {
  await mintTo(f.provider.connection, f.payer, f.mint, dest, f.seller, amount);
}

export { SystemProgram, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };
