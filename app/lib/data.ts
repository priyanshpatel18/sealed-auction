export type AuctionCategory = "NFT" | "Token" | "Governance";

/** UI status — `ending_soon` maps to "Live" in filters */
export type AuctionStatus = "live" | "ending_soon" | "ended";

export type ActivityItem = {
  id: string;
  label: string;
  at: string;
};

export type AuctionListing = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: AuctionCategory;
  status: AuctionStatus;
  startAt: string;
  endAt: string;
  sellerLabel: string;
  sellerWalletShort: string;
  /** Mock sealed bid count (amounts hidden) */
  bidCount: number;
  /** Optional floor — mock SOL */
  minBidSol?: number;
  /** For “newest” sort */
  createdAt: string;
  rules: string[];
  activity: ActivityItem[];
  endedWinner?: {
    address: string;
    commitment: string;
    outcome: string;
  };
};

export const AUCTION_LISTINGS: AuctionListing[] = [
  {
    id: "gov-aurora",
    slug: "gov-aurora",
    title: "Aurora DAO seat #12",
    shortDescription: "One-year governance seat with proposal rights.",
    description:
      "Sealed allocation for a single governance seat in the Aurora DAO pilot. Bids remain private until the window closes; the winning allocation is revealed only after TEE attestation and on-chain commitment.",
    category: "Governance",
    status: "live",
    startAt: "2020-05-01T10:00:00.000Z",
    endAt: "2030-06-15T18:00:00.000Z",
    sellerLabel: "Aurora Labs",
    sellerWalletShort: "Aur…7k2",
    bidCount: 47,
    minBidSol: 0.5,
    createdAt: "2025-11-01T12:00:00.000Z",
    rules: [
      "One sealed bid per wallet during the open window.",
      "Bid amounts are encrypted; no public order book.",
      "Winner determined in TEE after close; result committed on-chain.",
      "No refunds after commitment except as specified in DAO policy.",
    ],
    activity: [
      { id: "1", label: "Auction published", at: "2025-11-01T12:00:00.000Z" },
      { id: "2", label: "Sealed bids accepted (count hidden)", at: "2025-11-02T09:00:00.000Z" },
    ],
  },
  {
    id: "nft-eclipse",
    slug: "nft-eclipse",
    title: "Eclipse #04 — founder edition",
    shortDescription: "1/1 generative piece; sealed round, no floor games.",
    description:
      "Founder-edition NFT drop using sealed bids so collectors cannot snipe or front-run visible floors. After close, the winner and settlement proof are committed on-chain.",
    category: "NFT",
    status: "ending_soon",
    startAt: "2020-04-01T00:00:00.000Z",
    endAt: "2030-06-20T12:00:00.000Z",
    sellerLabel: "Studio North",
    sellerWalletShort: "4hQ…m0w",
    bidCount: 128,
    minBidSol: 0.1,
    createdAt: "2025-12-15T10:00:00.000Z",
    rules: [
      "Single 1/1; sealed bids only.",
      "No withdrawal of bid amount after window closes.",
      "Reveal follows TEE attestation + on-chain commitment.",
    ],
    activity: [
      { id: "1", label: "Drop announced", at: "2025-12-15T10:00:00.000Z" },
      { id: "2", label: "Bidding window opened", at: "2025-12-16T00:00:00.000Z" },
    ],
  },
  {
    id: "token-meridian",
    slug: "token-meridian",
    title: "Meridian community sale",
    shortDescription: "Allocation pool with sealed price discovery.",
    description:
      "Community token allocation with sealed bids to reduce manipulation and insider advantage. Winner selection uses TEE with a public commitment.",
    category: "Token",
    status: "live",
    startAt: "2020-05-10T08:00:00.000Z",
    endAt: "2030-07-01T00:00:00.000Z",
    sellerLabel: "Meridian Foundation",
    sellerWalletShort: "Mer…9p1",
    bidCount: 892,
    minBidSol: 0.01,
    createdAt: "2025-10-20T08:00:00.000Z",
    rules: [
      "KYC may apply off-chain per jurisdiction (mock).",
      "Sealed bids; no visible clearing price until close.",
      "Allocation subject to cap and TEE output.",
    ],
    activity: [
      { id: "1", label: "Sale contract indexed (mock)", at: "2025-10-20T08:00:00.000Z" },
    ],
  },
  {
    id: "gov-ledger",
    slug: "gov-ledger",
    title: "Ledger council rotation",
    shortDescription: "Rotating council seat — ended (mock).",
    description:
      "Historical mock auction for a rotating council seat. Demonstrates the ended state with winner reveal and commitment placeholder.",
    category: "Governance",
    status: "ended",
    startAt: "2028-01-01T00:00:00.000Z",
    endAt: "2029-12-01T00:00:00.000Z",
    sellerLabel: "Ledger Collective",
    sellerWalletShort: "Led…3aa",
    bidCount: 34,
    minBidSol: 1,
    createdAt: "2027-06-01T00:00:00.000Z",
    rules: ["Ended — rules archived (mock)."],
    activity: [
      { id: "1", label: "Auction closed", at: "2029-12-01T00:00:00.000Z" },
      { id: "2", label: "Commitment posted (mock)", at: "2029-12-01T00:05:00.000Z" },
    ],
    endedWinner: {
      address: "7Fk…9q2",
      commitment: "sha256:0x7a3f…c91 (mock)",
      outcome: "Seat assigned to highest sealed bid attestation.",
    },
  },
  {
    id: "nft-brutalist",
    slug: "nft-brutalist",
    title: "Twilight over Brutalist pier",
    shortDescription: "Digital edition — mock sealed-bid listing.",
    description:
      "Limited digital edition — UI mock. Emphasizes hidden bids until close and verifiable settlement narrative.",
    category: "NFT",
    status: "ended",
    startAt: "2027-06-01T00:00:00.000Z",
    endAt: "2028-06-01T00:00:00.000Z",
    sellerLabel: "Studio North",
    sellerWalletShort: "4hQ…m0w",
    bidCount: 56,
    minBidSol: 0.25,
    createdAt: "2027-05-01T00:00:00.000Z",
    rules: ["Ended — mock listing."],
    activity: [{ id: "1", label: "Settled (mock)", at: "2028-06-01T00:00:00.000Z" }],
    endedWinner: {
      address: "3xn…aP1",
      commitment: "sha256:0x9b2e…41d (mock)",
      outcome: "NFT transferred per sealed outcome proof.",
    },
  },
  {
    id: "token-pulse",
    slug: "token-pulse",
    title: "Pulse liquidity round",
    shortDescription: "Sealed allocation for LPs.",
    description:
      "Mock liquidity round with sealed bids. Use this card to test filters and navigation.",
    category: "Token",
    status: "live",
    startAt: "2020-01-01T00:00:00.000Z",
    endAt: "2030-08-01T00:00:00.000Z",
    sellerLabel: "Pulse Labs",
    sellerWalletShort: "Pls…88x",
    bidCount: 210,
    minBidSol: 0.05,
    createdAt: "2026-01-10T00:00:00.000Z",
    rules: ["Sealed bids; pro-rata allocation subject to TEE output (mock)."],
    activity: [{ id: "1", label: "Round opened", at: "2026-01-10T00:00:00.000Z" }],
  },
];

export function getListingById(id: string): AuctionListing | undefined {
  return AUCTION_LISTINGS.find((a) => a.id === id || a.slug === id);
}

export function getAllListings(): AuctionListing[] {
  return AUCTION_LISTINGS;
}

/** Live filter: includes `live` and `ending_soon` */
export function isLiveStatus(s: AuctionStatus): boolean {
  return s === "live" || s === "ending_soon";
}
