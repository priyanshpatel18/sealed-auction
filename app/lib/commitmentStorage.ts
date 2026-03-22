import BN from "bn.js";

const storageKey = (auctionId: string, bidder: string) =>
  `sealedAuctionCommit:${auctionId}:${bidder}`;

export type StoredCommit = { saltHex: string; amountStr: string };

/** Save salt + amount after a successful `commit_bid` so `reveal_bid` can reuse them. */
export function storeCommitSecrets(
  auctionId: string,
  bidder: string,
  salt: Buffer,
  amount: BN
): void {
  if (typeof sessionStorage === "undefined") return;
  const payload: StoredCommit = {
    saltHex: salt.toString("hex"),
    amountStr: amount.toString(10),
  };
  sessionStorage.setItem(storageKey(auctionId, bidder), JSON.stringify(payload));
}

export function loadCommitSecrets(
  auctionId: string,
  bidder: string
): { salt: Buffer; amount: BN } | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey(auctionId, bidder));
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as StoredCommit;
    return {
      salt: Buffer.from(p.saltHex, "hex"),
      amount: new BN(p.amountStr, 10),
    };
  } catch {
    return null;
  }
}
