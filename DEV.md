# Developer guide — `sealed-auction`

## Prerequisites

| Tool | Notes |
|------|-------|
| Rust + Solana | `solana-test-validator`; `cargo-build-sbf` for BPF |
| Anchor | Match `Anchor.toml` (`anchor_version = 0.32.1`), e.g. `avm use 0.32.1` |
| Node.js | LTS (20+) |
| Yarn | v1 (`package_manager = "yarn"` in `Anchor.toml`) |

```bash
cd sealed-auction
yarn install
```

## Production-style commands

Run in order from repo `sealed-auction/`:

```bash
# 1) Build program + IDL + TS types
anchor build

# 2) Full integration suite (starts local validator; ~5–15 min)
anchor test

# 3) Optional: Rust checks
cd programs/sealed-auction && cargo clippy --all-targets && cargo fmt --check && cd ../..

# 4) Optional: JS format
yarn lint
```

**CI one-liner:** `anchor build && anchor test` (same as `yarn test` after build).

**If port `8899` is in use:** stop other `solana-test-validator` / `anchor test` instances, or `lsof -i :8899` and kill the process, then rerun `anchor test`.

## Build outputs

- `target/deploy/sealed_auction_program.so`
- `target/idl/sealed_auction_program.json`
- `target/types/sealed_auction_program.ts`

`[lib] name` in `programs/sealed-auction/Cargo.toml` must be `sealed_auction_program` so Anchor’s post-test log step finds the IDL (avoids `ENOENT` on `target/idl/<name>.json`).

## Tests

- Script: `Anchor.toml` → `[scripts] test` (ts-mocha + ts-node).
- Do **not** set root `package.json` to `"type": "commonjs"` (breaks ts-node on some Node versions); see historical note in repo.
- Tests use wall-clock `sleep` vs `commit_end` / `reveal_end` — slow by design.
- If `CARGO_TARGET_DIR` is overridden: run `anchor build` / `anchor test` in a normal shell or `env -u CARGO_TARGET_DIR anchor test`.

## Frontend (`app/`)

```bash
cd app
yarn
yarn sync-idl
yarn dev
```

See `app/README.md` for env vars.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `SettlementTooEarly` | Increase `sleep` before settle vs `reveal_end`. |
| `8899` already in use | Another validator running. |
| Tests pass then `ENOENT` | IDL stem vs `[lib] name` mismatch. |
| `Cannot use import...` | Test script must use `ts-node/register` (see `Anchor.toml`). |

## Paths

| Path | Purpose |
|------|---------|
| `programs/sealed-auction/src/` | Program source |
| `tests/01-*.ts` … `07-*.ts` | Integration tests |
| `tests/helpers.ts`, `tests/test-utils.ts` | Hash helpers + assertions |
| `tests/fixture.ts` | Shared Anchor fixture |
| `SECURITY.md` | Trust model + prod checklist |
