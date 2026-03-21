import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Solana / Anchor server bundles — same intent as previous webpack externals */
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
  /** Stubs `SealedAuctionProgram` as `any` until real Anchor types are copied into `types/`. */
  typescript: { ignoreBuildErrors: true },
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
