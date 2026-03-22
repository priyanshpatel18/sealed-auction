import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Solana / Anchor server bundles — same intent as previous webpack externals */
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
  /** Types: run `yarn sync-idl` from `app/` after `anchor build` (copies IDL + `types/sealed_auction_program.ts`). */
  typescript: { ignoreBuildErrors: true },
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
