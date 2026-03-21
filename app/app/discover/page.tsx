import { DiscoverClient } from "@/components/discover/DiscoverClient";
import { getAllListings } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover · Sealed-bid auctions",
  description: "Browse mock sealed-bid auction listings — UI prototype only.",
};

export default function DiscoverPage() {
  const listings = getAllListings();
  return <DiscoverClient listings={listings} />;
}
