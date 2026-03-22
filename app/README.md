# Sealed auction — Next.js app

Marketing UI (landing, discover, mock auction detail) plus **public** and **private** ER demos (dual-RPC + WebSocket).

## Setup

```bash
npm install
# After `anchor build` in the repo root (`sealed-auction/`), keep IDL in sync:
npm run sync-idl
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

- `/` — landing (sealed-bid product UI)
- `/discover` — mock auction grid
- `/auction/[id]` — mock auction detail
- `/auction` — on-chain public ER demo (`AuctionConfig` + `AuctionRuntime`, delegate)
- `/private-auction` — TEE + `getAuthToken` flow

## Dev

```bash
npm run dev
# http://localhost:3333
```

Point RPC env vars at the same cluster where the program `9msixs2rRpafs5RaCbLxTeNEiZbvg5Qux3L8qENEN4JZ` is deployed.
