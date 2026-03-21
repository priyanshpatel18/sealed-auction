# Developer guide — `sealed-auction`

## Prerequisites

| Tool | Notes |
|------|--------|
| **Rust** + **Solana** | `solana-test-validator` for localnet; `cargo-build-sbf` for programs |
| **Anchor** | Version in `Anchor.toml` (`anchor_version = "0.32.1"`). CLI should match (e.g. `avm use 0.32.1`) |
| **Node.js** | LTS recommended (e.g. 20+) |
| **Yarn** | v1 — `package_manager = "yarn"` in `Anchor.toml` |

Install deps once:

```bash
cd sealed-auction
yarn install
```

## Local program workflow

```bash
# Build BPF + IDL + types
anchor build

# IDL output (used by tests + Next app)
#   target/idl/sealed_auction_program.json
#   target/types/sealed_auction_program.ts
```

- **`[lib] name`** in `programs/sealed-auction/Cargo.toml` must equal the IDL stem (`sealed_auction_program`). Anchor’s post-test `stream_logs` reads `target/idl/<lib name>.json`; a mismatch causes **`Error: No such file or directory (os error 2)`** after tests pass.

## Tests

```bash
anchor test
```

- Uses **`ts-mocha`** with **`ts-node/register`** (see `Anchor.toml` `[scripts] test`). Do **not** set root `package.json` to `"type": "commonjs"` — it breaks ESM/ts-node on Node 20+ (`Cannot use import statement outside a module`).
- Integration tests are slow (~30–60s) because of chain time (`reveal_end`, sleeps).

**If `CARGO_TARGET_DIR` is overridden** (e.g. IDE/sandbox): `target/deploy/*.so` may not appear under the repo. Run `anchor build` / `anchor test` in a normal shell or `env -u CARGO_TARGET_DIR anchor test`.

## Frontend (`app/`)

```bash
cd app
yarn
yarn sync-idl    # copies ../target/idl/sealed_auction_program.json → app/lib/
yarn dev         # http://localhost:3333
```

See `app/README.md` for `NEXT_PUBLIC_*` env vars (base RPC, ER, router, TEE).

## Program ID & cluster

- Declared in `programs/sealed-auction/src/lib.rs` (`declare_id!`).
- `Anchor.toml` `[programs.localnet]` key **`sealed_auction_program`** must match the IDL filename stem.

After changing the program id, redeploy / update `declare_id!`, `Anchor.toml`, and clients.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `SettlementTooEarly` in tests | `sleep` before `settle` too short vs `reveal_end` + clock skew — increase wait. |
| `AccountBorrowFailed` in `settle` | Borrow `Ref` held across CPI — ensure `try_borrow_data` scopes end before `invoke_signed` in refund loop. |
| Tests pass, then `ENOENT` / os error 2 | Anchor `stream_logs` + IDL path — align `[lib] name` with IDL stem (see above). |
| `Cannot use import statement outside a module` | Missing `ts-node/register` in test script or bad `"type"` in `package.json`. |

## Lint / format

```bash
yarn lint        # Prettier check
yarn lint:fix    # Prettier write
```

## Useful paths

| Path | Purpose |
|------|---------|
| `programs/sealed-auction/src/` | Program, instructions, `accounts.rs`, `state.rs` |
| `tests/sealed-auction.ts` | Integration tests |
| `tests/helpers.ts` | TS helpers (digests aligned with on-chain) |
| `app/lib/` | IDL JSON copy, program helpers, TEE helpers |
