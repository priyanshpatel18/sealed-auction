import { PublicKey } from "@solana/web3.js";

/**
 * Program id from `declare_id!` in `programs/sealed-auction`.
 * The program must be deployed to whatever cluster `NEXT_PUBLIC_BASE_RPC` uses,
 * and your wallet must be on that same cluster — otherwise simulation fails with
 * “Attempt to load a program that does not exist”.
 */
export const PROGRAM_ID = new PublicKey(
  "9msixs2rRpafs5RaCbLxTeNEiZbvg5Qux3L8qENEN4JZ"
);

/** Base Solana RPC (delegate + base reads) — must match wallet cluster + deployed program */
export const BASE_ENDPOINT = (
  process.env.NEXT_PUBLIC_BASE_RPC || "http://127.0.0.1:8899"
).trim();

/** MagicBlock router (delegation + validator FQDN) */
export const ROUTER_ENDPOINT =
  process.env.NEXT_PUBLIC_ROUTER_ENDPOINT || "https://devnet-router.magicblock.app";
export const ROUTER_WS_ENDPOINT =
  process.env.NEXT_PUBLIC_ROUTER_WS_ENDPOINT || "wss://devnet-router.magicblock.app";

/** Default ER endpoint before delegation resolves FQDN */
export const EPHEMERAL_ENDPOINT =
  process.env.NEXT_PUBLIC_EPHEMERAL_RPC || "https://devnet.magicblock.app";
export const EPHEMERAL_WS_ENDPOINT =
  process.env.NEXT_PUBLIC_EPHEMERAL_WS || "wss://devnet.magicblock.app";

/** Private ER / TEE base URL (append `?token=`) */
export const TEE_BASE_URL =
  process.env.NEXT_PUBLIC_TEE_BASE || "https://tee.magicblock.app";

export const AUCTION_SEED = Buffer.from("auction");
export const RUNTIME_SEED = Buffer.from("runtime");
export const VAULT_SEED = Buffer.from("vault");
export const BID_SEED = Buffer.from("bid");
export const BID_CIPHER_SEED = Buffer.from("bid_cipher");

export const PLAYER_STORAGE_KEY = "sealedAuctionDemoKeypair";
export const MIN_BALANCE_LAMPORTS = 0.05;
export const BLOCKHASH_CACHE_MAX_AGE_MS = 30_000;
