import type { Connection } from "@solana/web3.js";
import { decodeAuctionConfigData } from "@/lib/auctionConfigDecode";
import { recoverMetadataUriFromInitTx } from "@/lib/metadataUriFromInitTx";
import { programReadOnly } from "@/lib/program";

export type AuctionMetadataJson = {
  title?: string;
  name?: string;
  description?: string;
  image?: string;
  /** Pinned by our API as snake_case; also accept camelCase from hand-edited JSON. */
  starting_price_sol?: string;
  startingPriceSol?: string;
  properties?: Record<string, unknown>;
};

export type ProgramAuctionListItem = {
  auctionId: string;
  seller: string;
  phase: number;
  biddingStartSec: number;
  commitEndSec: number;
  revealEndSec: number;
  commitCount: number;
  revealCount: number;
  privateMode: boolean;
  metadataUri: string;
  title: string;
  /** Full description from metadata (card may clamp visually). */
  description: string;
  shortDescription: string;
  imageUrl: string | null;
  /** From metadata JSON `starting_price_sol` (display only). */
  startingPriceSol: string | null;
};

/** True while the commit window is open (Bidding phase and on-chain time window). */
export function isAuctionAcceptingCommits(
  row: Pick<
    ProgramAuctionListItem,
    "phase" | "biddingStartSec" | "commitEndSec"
  >,
  nowSec: number
): boolean {
  if (row.phase !== 0) return false;
  return nowSec >= row.biddingStartSec && nowSec < row.commitEndSec;
}

export function startingPriceSolFromMetadata(
  meta: AuctionMetadataJson | null | undefined
): string | null {
  if (!meta) return null;
  const direct =
    meta.starting_price_sol?.trim() || meta.startingPriceSol?.trim();
  if (direct) return direct;
  const p = meta.properties;
  if (p && typeof p === "object") {
    const raw =
      (p as { starting_price_sol?: unknown }).starting_price_sol ??
      (p as { startingPriceSol?: unknown }).startingPriceSol;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  }
  return null;
}

export function resolveMetadataImageUrl(
  raw: string | undefined,
  metadataUri: string
): string | null {
  const image = raw?.trim();
  if (!image) return null;
  if (image.startsWith("ipfs://")) {
    const path = image.slice("ipfs://".length).replace(/^ipfs\//, "");
    const base =
      process.env.NEXT_PUBLIC_PINATA_GATEWAY?.replace(/\/$/, "") ||
      "https://gateway.pinata.cloud/ipfs";
    return `${base}/${path}`;
  }
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  try {
    const base = new URL(metadataUri);
    return new URL(image, base).href;
  } catch {
    return null;
  }
}

async function fetchMetadataViaProxy(
  metadataUrl: string
): Promise<AuctionMetadataJson | null> {
  const u = `/api/metadata-proxy?url=${encodeURIComponent(metadataUrl)}`;
  const res = await fetch(u);
  if (!res.ok) return null;
  try {
    return (await res.json()) as AuctionMetadataJson;
  } catch {
    return null;
  }
}

/**
 * All `AuctionConfig` accounts for this program + optional IPFS metadata
 * (title, description, image) when `metadata_uri` was set at init.
 */
export async function fetchAllProgramAuctionsWithMetadata(
  connection: Connection
): Promise<ProgramAuctionListItem[]> {
  const program = programReadOnly(connection);
  const memcmp = program.coder.accounts.memcmp("auctionConfig");
  const raw = await connection.getProgramAccounts(program.programId, {
    filters: [
      {
        memcmp: {
          offset: memcmp.offset,
          bytes: memcmp.bytes,
        },
      },
    ],
  });

  const decoded = raw
    .map(({ pubkey, account }) => {
      try {
        return {
          pubkey,
          account: decodeAuctionConfigData(program, account.data),
        };
      } catch {
        return null;
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const enriched: ProgramAuctionListItem[] = [];
  const chunkSize = 4;
  for (let i = 0; i < decoded.length; i += chunkSize) {
    const slice = decoded.slice(i, i + chunkSize);
    const part = await Promise.all(
      slice.map(async ({ pubkey, account }) => {
        let metadataUri = account.metadataUri?.trim() ?? "";
        if (!metadataUri) {
          const recovered = await recoverMetadataUriFromInitTx(
            connection,
            program.programId,
            pubkey,
            account.auctionId
          );
          if (recovered) metadataUri = recovered;
        }
        let meta: AuctionMetadataJson | null = null;
        if (metadataUri) {
          meta = await fetchMetadataViaProxy(metadataUri);
        }
        const title =
          (meta?.title || meta?.name)?.trim() ||
          `Auction ${account.auctionId.toString()}`;
        const desc = (meta?.description ?? "").trim();
        const imageUrl = resolveMetadataImageUrl(meta?.image, metadataUri);
        const startingPriceSol = startingPriceSolFromMetadata(meta);
        return {
          auctionId: account.auctionId.toString(),
          seller: account.seller.toBase58(),
          phase: account.phase,
          biddingStartSec: account.biddingStart.toNumber(),
          commitEndSec: account.commitEnd.toNumber(),
          revealEndSec: account.revealEnd.toNumber(),
          commitCount: account.commitCount,
          revealCount: account.revealCount,
          privateMode: account.privateMode,
          metadataUri,
          title,
          description: desc,
          shortDescription: desc.slice(0, 220),
          imageUrl,
          startingPriceSol,
        };
      })
    );
    enriched.push(...part);
  }

  enriched.sort((a, b) => {
    const an = BigInt(a.auctionId);
    const bn = BigInt(b.auctionId);
    if (bn > an) return 1;
    if (bn < an) return -1;
    return 0;
  });

  return enriched;
}
