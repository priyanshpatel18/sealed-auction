# Veil — Next.js app

Frontend for **Veil** (sealed-bid auctions). Talks to the on-chain program:

**Program ID:** `9msixs2rRpafs5RaCbLxTeNEiZbvg5Qux3L8qENEN4JZ`  
(must match `app/lib/config.ts` and the deployment on your RPC cluster)

## Setup

```bash
cd app
yarn install
# After `anchor build` in the repo root, keep the IDL in sync:
yarn sync-idl
yarn dev
```

Default dev server: **http://localhost:3333** (see `package.json`).

## Environment variables

### Public (browser)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_RPC` | Solana RPC — **must** match wallet network and program deployment (default `http://127.0.0.1:8899` in code). |
| `NEXT_PUBLIC_EPHEMERAL_RPC` / `NEXT_PUBLIC_EPHEMERAL_WS` | MagicBlock ER endpoints. |
| `NEXT_PUBLIC_ROUTER_ENDPOINT` / `NEXT_PUBLIC_ROUTER_WS_ENDPOINT` | MagicBlock router. |
| `NEXT_PUBLIC_TEE_BASE` | TEE base URL for private flow. |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Optional IPFS gateway for listing previews. |

### Server only (`app/.env`)

| Variable | Purpose |
|----------|---------|
| `PINATA_JWT` | Pinata API JWT for **Create auction** metadata + image upload routes. |
| `PINATA_GATEWAY_URL` | Optional; defaults to Pinata gateway. |

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing |
| `/discover` | On-chain auction grid |
| `/auction/live/[auctionId]` | Auction detail + commit / reveal |
| `/auction/[id]` | Redirects to live page |
| `/create-auction` | Create listing + initialize auction |
| `/private-auction` | Private / TEE demo |

Full project overview and contract table: **[../README.md](../README.md)**.
