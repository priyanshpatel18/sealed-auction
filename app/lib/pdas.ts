import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import {
  PROGRAM_ID,
  AUCTION_SEED,
  RUNTIME_SEED,
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
