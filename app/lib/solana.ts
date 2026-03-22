import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { DELEGATION_PROGRAM_ID } from "@magicblock-labs/ephemeral-rollups-sdk";
import { MIN_BALANCE_LAMPORTS, BLOCKHASH_CACHE_MAX_AGE_MS } from "./config";
import type { CachedBlockhash } from "./types";

export const walletAdapterFrom = (keypair: Keypair) => ({
  publicKey: keypair.publicKey,
  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (transaction as any).sign(keypair);
    return transaction;
  },
  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> {
    for (const tx of transactions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tx as any).sign(keypair);
    }
    return transactions;
  },
});

export const loadOrCreateKeypair = (storageKey: string): Keypair => {
  if (typeof window === "undefined") return Keypair.generate();
  const stored = window.localStorage.getItem(storageKey);
  if (stored) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(stored)));
  }
  const generated = Keypair.generate();
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(Array.from(generated.secretKey))
  );
  return generated;
};

export const ensureFunds = async (
  connection: Connection,
  keypair: Keypair
): Promise<void> => {
  await ensureWalletFunds(connection, keypair.publicKey);
};

/** Devnet/local: airdrop SOL to a connected wallet when balance is low. */
export const ensureWalletFunds = async (
  connection: Connection,
  owner: PublicKey
): Promise<void> => {
  const balance = await connection.getBalance(owner);
  if (balance < MIN_BALANCE_LAMPORTS * LAMPORTS_PER_SOL) {
    const sig = await connection.requestAirdrop(owner, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  }
};

export const fetchAndCacheBlockhash = async (
  connection: Connection,
  cacheRef: { current: CachedBlockhash | null }
): Promise<void> => {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  cacheRef.current = {
    blockhash,
    lastValidBlockHeight,
    timestamp: Date.now(),
  };
};

export const getCachedBlockhash = (
  cacheRef: { current: CachedBlockhash | null }
): string | null => {
  const cached = cacheRef.current;
  if (!cached) return null;
  if (Date.now() - cached.timestamp > BLOCKHASH_CACHE_MAX_AGE_MS) return null;
  return cached.blockhash;
};

export const checkDelegationStatus = async (
  connection: Connection,
  accountPubkey: import("@solana/web3.js").PublicKey
): Promise<boolean> => {
  const accountInfo = await connection.getAccountInfo(accountPubkey);
  return !!accountInfo && accountInfo.owner.equals(DELEGATION_PROGRAM_ID);
};
