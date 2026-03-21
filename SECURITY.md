# Security model & audit notes — `sealed_auction_program`

This document summarizes trust assumptions, known limitations, and items integrators should review before production mainnet use. It is **not** a substitute for an independent audit.

## Threat model (summary)

| Asset | On-chain guarantee |
|--------|---------------------|
| **Public bids** | Commit–reveal binding via `SHA256("sealed-auction:v1" \|\| …)`; fake reveal fails `CommitmentMismatch`. |
| **Escrow** | Reveal transfers `bid_amount` from bidder ATA → vault; SPL constraints enforce mint/owner. |
| **Settlement** | `settle_auction` pays seller from vault (PDA signer) and refunds losers per `remaining_accounts`. |
| **Private ciphertext set** | `compute_winner_private` recomputes `aggregate_digest` from all `BidCiphertext` accounts; mismatch → `AggregateMismatch`. |

## Trust assumptions

### Public mode

- **Anyone may call** `settle_auction` after `reveal_end` (authority is not restricted to seller). This is **permissionless settlement**: payouts are constrained by vault balance and `seller_token` / refund ATAs. Verify this matches your product policy.
- **First-price leader** uses **strict `>`** for updates: equal bids do **not** replace the current leader (first revealer wins ties).
- **Front-running**: commitments are visible on-chain before reveal; classic sealed-bid caveats apply.

### Private mode

- **`winner` and `winning_price` are caller-supplied** to `compute_winner_private`. The program **does not** decrypt ciphertext or prove the bid amounts on-chain. Security reduces to:
  - **Off-chain / TEE** correctness of winner selection, and
  - **Binding** of the published result to the ciphertext set via `aggregate_digest` + `result_hash_private_v1`.
- **No automatic refunds** in `settle_private`; fund the vault appropriately.

### Ephemeral rollups (MagicBlock)

- `AuctionRuntime` delegation is for **UX / latency**; authoritative state for settlement is `AuctionConfig` on the base program path. Understand ER sync semantics for your deployment.

## Error enum hygiene

Some variants in `SealedAuctionError` may be **unused** in program logic today (e.g. reserved for future checks). Clients should still handle **Anchor + program** errors generically.

## Test suite

- Integration tests live under `tests/` (`01`–`07` + helpers). They cover:
  - Hash parity (TypeScript vs on-chain schemes),
  - Public and private **happy paths**,
  - Phase/window/cross-mode **negative** cases,
  - Aggregate mismatch, ciphertext length, permissionless edge cases.

Run: `anchor test` (see `Anchor.toml` and `DEV.md`).

## Production checklist (non-exhaustive)

- [ ] Pin program ID, upgrade authority, and multisig for upgrades.
- [ ] Rate-limit / monitor `compute_winner_private` callers if you require a specific oracle/TEE key.
- [ ] Document client-side salt generation (high entropy) for public commits.
- [ ] Run fuzzing / formal review on off-chain TEE + aggregate pipeline for private mode.
- [ ] Independent audit for token accounting, CPI ordering, and account constraints.
