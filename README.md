# Veil — Sealed-bid auctions on Solana

**Veil** is a trustless first-price sealed-bid auction on Solana, implemented as an **Anchor** program with a **Next.js** frontend. Bidders **commit** a cryptographic hash of their bid (amount + salt), then **reveal** during a later window to pay into the auction vault. The stack also supports an optional **private** path (ciphertext bids + TEE / aggregate verification) and **MagicBlock Ephemeral Rollups** for low-latency mirrored state.

---

## On-chain program (contract)

| Field | Value |
|--------|--------|
| **Program name** | `sealed_auction_program` |
| **Program ID** | `9msixs2rRpafs5RaCbLxTeNEiZbvg5Qux3L8qENEN4JZ` |
| **Source** | `programs/sealed-auction/src/lib.rs` (`declare_id!`) |
| **IDL (synced to app)** | `app/lib/sealed_auction_program.json` |

The frontend hard-codes this ID in `app/lib/config.ts` as `PROGRAM_ID`. It must match the program **actually deployed** on the cluster your RPC and wallet use.

**Solana Explorer**

- [Program account — Devnet](https://explorer.solana.com/address/9msixs2rRpafs5RaCbLxTeNEiZbvg5Qux3L8qENEN4JZ?cluster=devnet)

This program is **not deployed on Solana mainnet** yet; the program ID above is used for devnet / localnet in this repo.

> **Note:** `Anchor.toml` lists the same program ID for **localnet** and **devnet**. After `anchor deploy`, verify on-chain that this address holds your build. If you deploy a fresh keypair, update `declare_id!`, `Anchor.toml`, `app/lib/config.ts`, and run `yarn sync-idl` in `app/`.

---

## How the public auction works

1. **Initialize** — Seller creates `AuctionConfig`, `AuctionRuntime`, and vault PDA with bidding / commit-end / reveal-end timestamps (and optional IPFS metadata URI).
2. **Commit (bidding phase)** — Each bidder signs `commit_bid` once per wallet per auction. The instruction stores a **SHA-256 commitment** over `(auction_id, bidder, amount_le, salt)`; it does **not** move the bid amount. Creating the bid account costs a small **rent** deposit (lamports), not the full bid.
3. **Start reveal** — After the commit window closes, anyone can move the auction to **reveal** phase (`start_reveal`).
4. **Reveal** — Bidders call `reveal_bid` with the same **amount** and **salt**; the program verifies the hash and **transfers** that amount from the bidder to the **vault**.
5. **Settle** — Seller completes settlement according to program rules (winner / result hash on-chain).

**PDAs (seeds)** — Used by clients and tests; see `app/lib/pdas.ts` and `app/lib/config.ts`:

| Account | Seed prefix + suffix |
|---------|----------------------|
| Auction config | `auction` + `auction_id` (8-byte LE u64) |
| Runtime mirror | `runtime` + `auction_id` (8-byte LE u64) |
| Vault | `vault` + `auction_id` (8-byte LE u64) |
| Bid commitment | `bid` + `auction_id` (8-byte LE) + `bidder` (pubkey) |

**Private mode** — Separate instruction path with ciphertext bids and TEE-related flows; see `programs/sealed-auction/README.md` and `SECURITY.md`.

---

## Repository layout

| Path | Purpose |
|------|---------|
| `programs/sealed-auction/` | Anchor program (Rust) |
| `tests/` | Integration tests (Mocha + ts-node) |
| `app/` | **Veil** Next.js frontend (discover, live auction, create listing, wallet) |
| `target/deploy/` | Built `.so` and deploy keypair (local) |
| `target/idl/sealed_auction_program.json` | IDL after `anchor build` |
| `DEV.md` | Detailed developer workflow and troubleshooting |
| `SECURITY.md` | Trust model and production checklist |

---

## Prerequisites

- **Rust** + **Solana CLI** (for local validator / deploy)
- **Anchor** `0.32.1` (see `Anchor.toml`; e.g. `avm use 0.32.1`)
- **Node.js** 20+ and **Yarn** 1.x

---

## Quick start

From the repo root (`sealed-auction/`):

```bash
yarn install
anchor build
anchor test          # starts local validator; can take several minutes
```

Frontend:

```bash
cd app
yarn
yarn sync-idl        # copy IDL into app/lib (after anchor build)
yarn dev             # default http://localhost:3333
```

---

## Configuration — frontend (`app/`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BASE_RPC` | Solana HTTP RPC (**must** match wallet cluster and where the program is deployed). Default in code: `http://127.0.0.1:8899`. |
| `NEXT_PUBLIC_EPHEMERAL_RPC` / `NEXT_PUBLIC_EPHEMERAL_WS` | MagicBlock ER HTTP / WebSocket (optional demos). |
| `NEXT_PUBLIC_ROUTER_ENDPOINT` / `NEXT_PUBLIC_ROUTER_WS_ENDPOINT` | MagicBlock router. |
| `NEXT_PUBLIC_TEE_BASE` | TEE base URL for private flow (default `https://tee.magicblock.app`). |
| `PINATA_JWT` | Server-only — **Create auction** uploads metadata/images via Pinata (`app/.env`). |
| `PINATA_GATEWAY_URL` | Optional gateway for Pinata responses. |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Optional public gateway prefix for metadata URLs in listings. |

See `app/lib/config.ts` for defaults.

---

## App routes (Veil)

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/discover` | Grid of on-chain auctions (metadata preview from IPFS) |
| `/auction/live/[auctionId]` | Live auction: listing + sealed commit / reveal |
| `/auction/[id]` | Redirects to `/auction/live/[id]` |
| `/create-auction` | Seller flow (Pinata + on-chain init) |
| `/private-auction` | Private / TEE demo |

---

## Deploying the program

```bash
# Example: devnet (ensure wallet and solana config point at devnet)
solana config set --url https://api.devnet.solana.com
anchor build
anchor deploy --provider.cluster devnet
```

Deploy address must match `declare_id!` **or** you must update all references (program keypair, `lib.rs`, `Anchor.toml`, `app/lib/config.ts`, IDL sync).

---

## Scripts (repo root)

| Command | Description |
|---------|-------------|
| `yarn build` | `anchor build` |
| `yarn test` | `anchor test` |
| `yarn ci` | `anchor build && anchor test` |
| `yarn lint` | Prettier check |

---

## Further reading

- **[DEV.md](./DEV.md)** — Tests, IDL naming, port conflicts, CI.
- **[app/README.md](./app/README.md)** — App-focused setup summary.
- **[programs/sealed-auction/README.md](./programs/sealed-auction/README.md)** — Instruction and account design notes.
- **[SECURITY.md](./SECURITY.md)** — Threat model and operational checklist.

---

## License

Root `package.json` specifies **ISC** unless the project adds a separate license file.
