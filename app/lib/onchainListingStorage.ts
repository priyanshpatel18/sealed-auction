const STORAGE_KEY = "sealed_auction_onchain_list";

export type StoredOnchainAuction = {
  auctionId: string;
  tx: string;
  at: number;
};

function readRaw(): StoredOnchainAuction[] {
  if (typeof window === "undefined") return [];
  try {
    const s = window.localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is StoredOnchainAuction =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as StoredOnchainAuction).auctionId === "string" &&
        typeof (x as StoredOnchainAuction).tx === "string" &&
        typeof (x as StoredOnchainAuction).at === "number"
    );
  } catch {
    return [];
  }
}

export function rememberCreatedAuction(auctionId: string, tx: string): void {
  if (typeof window === "undefined") return;
  const prev = readRaw();
  const next = [
    { auctionId, tx, at: Date.now() },
    ...prev.filter((e) => e.auctionId !== auctionId),
  ].slice(0, 40);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function loadRememberedAuctions(): StoredOnchainAuction[] {
  return readRaw();
}
