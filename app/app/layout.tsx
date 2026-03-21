import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { BackgroundStreaks } from "@/components/BackgroundStreaks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SolanaWalletProvider } from "@/components/SolanaWalletProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MagicBlock · Sealed-bid auctions",
    template: "%s · MagicBlock",
  },
  description:
    "Sealed-bid auctions with TEE settlement and verifiable on-chain results — UI prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-screen flex-col bg-brand-bg text-brand-cream antialiased">
        <BackgroundStreaks />
        <SolanaWalletProvider>
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
