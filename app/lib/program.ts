import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { Connection, PublicKey } from "@solana/web3.js";
import type { SealedAuctionProgram } from "@/types/sealed_auction_program";
import { PROGRAM_ID } from "./config";
import idlJson from "./sealed_auction_program.json";

const idlAddress = (idlJson as { address: string }).address;
if (idlAddress !== PROGRAM_ID.toBase58()) {
  throw new Error(
    `IDL address (${idlAddress}) must equal PROGRAM_ID in config (${PROGRAM_ID.toBase58()}). Run: cd app && yarn sync-idl`
  );
}

/**
 * Anchor client for `sealed_auction_program` (IDL: `./sealed_auction_program.json`).
 * Cast to `Program<SealedAuctionProgram>` so `program.account.auctionConfig` etc. type-check;
 * the IDL JSON drives runtime behavior.
 */
export function programFor(
  connection: Connection,
  wallet: Wallet
): Program<SealedAuctionProgram> {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );
  return new Program(idlJson as Idl, provider) as Program<SealedAuctionProgram>;
}

/** Read-only client (fetch/subscribe) without a connected wallet. */
export function programReadOnly(
  connection: Connection
): Program<SealedAuctionProgram> {
  const wallet: Wallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  };
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );
  return new Program(idlJson as Idl, provider) as Program<SealedAuctionProgram>;
}
