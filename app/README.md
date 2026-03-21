# Sealed auction — Next.js demo

Dual-RPC + WebSocket demo for **public** (normal ER) and **private** (TEE token URL) flows.

## Setup

```bash
cd app
yarn
# After `anchor build`, keep IDL in sync:
yarn sync-idl
```

## Env (optional)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_RPC` | Base Solana RPC (default `http://127.0.0.1:8899`) |
| `NEXT_PUBLIC_EPHEMERAL_RPC` | MagicBlock ER HTTP endpoint |
| `NEXT_PUBLIC_EPHEMERAL_WS` | Matching `wss://` |
| `NEXT_PUBLIC_ROUTER_ENDPOINT` | MagicBlock router (`https://devnet-router.magicblock.app`) |
| `NEXT_PUBLIC_ROUTER_WS_ENDPOINT` | Router WebSocket |
| `NEXT_PUBLIC_TEE_BASE` | Private ER TEE base (default `https://tee.magicblock.app`) |

## Routes

- `/` — links
- `/auction` — `AuctionConfig` (base polling) + `AuctionRuntime` (ER WebSocket), delegate via `delegate_runtime`
- `/private-auction` — `verifyTeeRpcIntegrity` + `getAuthToken`, client-side `result_hash` check vs ciphertext digests

## Dev

```bash
yarn dev
# open http://localhost:3333
```

Point RPC env vars at the same cluster where the program `57owAwKC7TkWzsHPdaL7XXWfbj8FS1YUUw4sxWWmBarm` is deployed.
