import type { Wallet } from "@coral-xyz/anchor";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

/** Maps the browser wallet adapter to Anchor's `Wallet` (used by `Program` / `AnchorProvider`). */
export function anchorWalletFromAdapter(w: WalletContextState): Wallet | null {
  if (!w.publicKey || !w.signTransaction) return null;
  const signTransaction = w.signTransaction.bind(w);
  const signAllTransactions =
    w.signAllTransactions?.bind(w) ??
    (async <T extends Transaction | VersionedTransaction>(txs: T[]) => {
      const out: T[] = [];
      for (const tx of txs) {
        out.push(await signTransaction(tx));
      }
      return out;
    });
  return {
    publicKey: w.publicKey,
    signTransaction,
    signAllTransactions,
  } as Wallet;
}
