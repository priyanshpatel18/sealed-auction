import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Sealed-bid auction (MagicBlock)
      </h1>
      <p className="text-zinc-400 max-w-prose">
        Stage 1: normal ER — commit/reveal counts and realtime{" "}
        <code className="text-emerald-400">AuctionRuntime</code> leader via WebSocket
        on the ephemeral connection. Stage 2: Private ER — encrypted bids + TEE token
        flow (no bid amounts on-chain after close).
      </p>
      <ul className="flex flex-col gap-3">
        <li>
          <Link
            className="text-emerald-400 hover:underline"
            href="/auction"
          >
            Public auction (realtime ER)
          </Link>
          <span className="text-zinc-500"> — dual RPC + WS subscription</span>
        </li>
        <li>
          <Link
            className="text-emerald-400 hover:underline"
            href="/private-auction"
          >
            Private auction (TEE + aggregate digest)
          </Link>
          <span className="text-zinc-500"> — verifyTeeRpcIntegrity / getAuthToken</span>
        </li>
      </ul>
      <p className="text-sm text-zinc-500">
        Run <code className="text-zinc-300">cd app && yarn && yarn dev</code> then
        point RPC env vars at your cluster (see <code className="text-zinc-300">lib/config.ts</code>
        ).
      </p>
    </main>
  );
}
