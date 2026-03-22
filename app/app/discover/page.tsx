import { DiscoverClient } from "@/components/discover/DiscoverClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover · Sealed-bid auctions",
  description: "Browse on-chain sealed-bid auctions with IPFS metadata.",
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
