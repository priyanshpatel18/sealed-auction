import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import {
  PROGRAM_ID,
  AUCTION_SEED,
  RUNTIME_SEED,
  VAULT_SEED,
  BID_SEED,
  BID_CIPHER_SEED,
} from "./config";

export function auctionPda(auctionId: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [AUCTION_SEED, auctionId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];
}

export function runtimePda(auctionId: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [RUNTIME_SEED, auctionId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];
}

/** Native SOL escrow PDA — seeds `["vault", auction_id_le]`. */
export function vaultPda(auctionId: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, auctionId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];
}

export function bidPda(auctionId: BN, bidder: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      BID_SEED,
      auctionId.toArrayLike(Buffer, "le", 8),
      bidder.toBuffer(),
    ],
    PROGRAM_ID
  )[0];
}

export function bidCipherPda(auctionId: BN, bidder: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      BID_CIPHER_SEED,
      auctionId.toArrayLike(Buffer, "le", 8),
      bidder.toBuffer(),
    ],
    PROGRAM_ID
  )[0];
}

/** @deprecated Use `vaultPda` — same function (native SOL vault PDA). */
export const vaultAta = vaultPda;

/**
 * @deprecated Native SOL flow does not use SPL ATAs. Stale pages may still import this;
 * it returns `bidder` so the symbol resolves — do not pass into `revealBid` (use updated
 * `auction/page.tsx` with `vaultPda` + `systemProgram` only).
 */
export function bidderTokenAta(_mint: PublicKey, bidder: PublicKey): PublicKey {
  return bidder;
}
