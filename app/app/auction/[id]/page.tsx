import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Auction ${id} · Sealed-bid auction`,
    description: "On-chain sealed-bid auction details.",
  };
}

/** Legacy mock routes — all real data lives under `/auction/live/[auctionId]`. */
export default async function AuctionLegacyRoute({ params }: Props) {
  const { id } = await params;
  redirect(`/auction/live/${encodeURIComponent(id)}`);
}
