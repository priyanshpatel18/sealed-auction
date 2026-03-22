import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create auction",
  description:
    "Launch a sealed-bid auction — private bids until close, verifiable on-chain.",
};

export default function CreateAuctionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
