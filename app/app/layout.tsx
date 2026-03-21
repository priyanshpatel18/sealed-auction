import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sealed Auction — MagicBlock ER",
  description:
    "Public + Private ER sealed-bid auction demo with realtime runtime subscriptions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="px-4 py-8 max-w-4xl mx-auto">{children}</body>
    </html>
  );
}
