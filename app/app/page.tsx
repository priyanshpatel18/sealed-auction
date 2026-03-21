import { LandingPage } from "@/components/landing/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sealed-Bid Auction · Trustless & verifiable",
  description:
    "Hidden bids until close. TEE winner selection. On-chain commitment. UI prototype.",
};

export default function Home() {
  return <LandingPage />;
}
