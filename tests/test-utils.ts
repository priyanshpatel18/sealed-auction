import { AnchorError } from "@coral-xyz/anchor";
import { expect } from "chai";
import { createHash } from "crypto";
import BN from "bn.js";
import { readFileSync } from "fs";
import { join } from "path";
import { PublicKey } from "@solana/web3.js";
import { aggregateCiphertextDigestsV1, ciphertextDigestV1 } from "./helpers";

export { aggregateCiphertextDigestsV1, ciphertextDigestV1 };

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const idlPath = join(process.cwd(), "target/idl/sealed_auction_program.json");
const codeToName = new Map<number, string>();
try {
  const idl = JSON.parse(readFileSync(idlPath, "utf8")) as {
    errors?: { code: number; name: string }[];
  };
  for (const e of idl.errors ?? []) {
    codeToName.set(e.code, e.name);
  }
} catch {}

function extractErrorName(err: unknown): string | undefined {
  const any = err as {
    error?: { errorCode?: { code?: string } };
    logs?: string[];
    message?: string;
  };
  const direct = any?.error?.errorCode?.code;
  if (direct) return direct;

  if (any?.logs) {
    const fromLogs = AnchorError.parse(any.logs);
    const c = fromLogs?.error?.errorCode?.code;
    if (c) return c;
  }

  const msg = any?.message ?? (err instanceof Error ? err.message : String(err));
  const codeFromMsg = msg.match(/Error Code:\s*(\w+)/);
  if (codeFromMsg) return codeFromMsg[1];
  if (msg.includes("AccountNotInitialized")) return "AccountNotInitialized";
  const hex = msg.match(/custom program error:\s*(0x[0-9a-fA-F]+)/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    let name = codeToName.get(n);
    if (!name && n < 256) name = codeToName.get(6000 + n);
    if (name) return name;
  }
  const custom = msg.match(/"Custom":\s*(\d+)/);
  if (custom) {
    const n = parseInt(custom[1], 10);
    let name = codeToName.get(n);
    if (!name && n < 256) name = codeToName.get(6000 + n);
    if (name) return name;
  }
  return undefined;
}

export function assertAnchorError(err: unknown, code: string): void {
  const got = extractErrorName(err);
  expect(got, `expected program error ${code}, got ${got ?? String(err)}`).to.equal(
    code
  );
}

export function hashCommitment(
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

export function resultHashV1(
  auctionId: BN,
  winner: PublicKey,
  winningPrice: BN,
  commitCount: number,
  revealCount: number,
  tokenMint: PublicKey
): Buffer {
  const h = createHash("sha256");
  h.update(Buffer.from("result:v1"));
  h.update(Buffer.from(auctionId.toArray("le", 8)));
  h.update(winner.toBuffer());
  h.update(Buffer.from(winningPrice.toArray("le", 8)));
  const cc = Buffer.alloc(4);
  cc.writeUInt32LE(commitCount, 0);
  h.update(cc);
  const rc = Buffer.alloc(4);
  rc.writeUInt32LE(revealCount, 0);
  h.update(rc);
  h.update(tokenMint.toBuffer());
  return h.digest();
}

export function resultHashPrivateV1(
  auctionId: BN,
  winner: PublicKey,
  winningPrice: BN,
  aggregateDigest: Buffer
): Buffer {
  const h = createHash("sha256");
  h.update(Buffer.from("result:private:v1"));
  h.update(Buffer.from(auctionId.toArray("le", 8)));
  h.update(winner.toBuffer());
  h.update(Buffer.from(winningPrice.toArray("le", 8)));
  h.update(aggregateDigest);
  return h.digest();
}

export function uniqueAuctionId(): BN {
  return new BN((Date.now() % 1_000_000_000) + Math.floor(Math.random() * 1_000_000));
}
