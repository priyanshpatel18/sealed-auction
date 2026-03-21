# Sealed-bid auction (Anchor + MagicBlock ER)

Trustless sealed-bid auction with **normal ER** (commit/reveal/leader mirror) and **Private ER** path (ciphertext bids + on-chain aggregate verification + TEE URL flow).

## Layout

- `programs/sealed-auction/` — Anchor program (`sealed_auction_program`)
- `tests/` — Mocha + ts-node integration tests
- `app/` — Next.js UI (dual RPC, WS, TEE helpers)

## Commands

```bash
anchor build
anchor test

cd app && yarn && yarn sync-idl && yarn dev
```

`[lib] name` in `programs/sealed-auction/Cargo.toml` must match `target/idl/<name>.json` so Anchor CLI `stream_logs` can read the IDL after tests.

## Developer setup

See **[DEV.md](./DEV.md)** for prerequisites, Anchor workflow, tests, frontend, and troubleshooting.

## Docs

See the project plan (not committed here) for stage-1 vs stage-2 behavior. On-chain `compute_winner_private` verifies `aggregate_digest` against all `BidCiphertext` accounts passed as remaining accounts.
