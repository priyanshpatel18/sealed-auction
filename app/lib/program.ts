import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { Connection } from "@solana/web3.js";
import type { SealedAuctionProgram } from "../../target/types/sealed_auction_program";
import idlJson from "./sealed_auction_program.json";

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
