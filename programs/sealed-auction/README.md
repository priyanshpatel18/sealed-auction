# `sealed_auction_program` — on-chain contract

Anchor program for a **first-price sealed-bid auction** on Solana with **MagicBlock Ephemeral Rollups** (`#[ephemeral]`) and an optional **private** path (opaque ciphertext bids + on-chain aggregate verification of the TEE-reported winner).

---

## Program ID & build

- **ID:** `declare_id!(...)` in `src/lib.rs`. Must match `Anchor.toml` `[programs.<cluster>]` and deploy keypairs.
- **Build** (from workspace `sealed-auction/`):

  ```bash
  anchor build
  ```

- **Artifacts:** `target/deploy/sealed_auction_program.so`, `target/idl/sealed_auction_program.json`, `target/types/sealed_auction_program.ts`
- **`[lib] name`** in `Cargo.toml` is `sealed_auction_program` so the IDL stem matches Anchor CLI `stream_logs` (see repo `DEV.md`).

---

## Source layout

| Path | Role |
|------|------|
| `src/lib.rs` | `#[ephemeral]` + `#[program]`, `declare_id!`, `include!("accounts.rs")` at crate root |
| `src/accounts.rs` | All `#[derive(Accounts)]` contexts |
| `src/state.rs` | Account structs, `AuctionPhase`, events |
| `src/errors.rs` | `SealedAuctionError` |
| `src/utils.rs` | `hash_commitment`, `result_hash_*`, `ciphertext_digest_v1`, `aggregate_ciphertext_digests_v1` |
| `src/instructions/` | Handlers |

---

## Detailed states

### `AuctionPhase` (`auction.phase` on `AuctionConfig`)

| Value | Name | Meaning |
|------:|------|---------|
| `0` | **Bidding** | Auction initialized. Public: commitments allowed in `[bidding_start, commit_end)`. Private: encrypted bids allowed in same window. |
| `1` | **Reveal** | Public: bidders reveal; leader updated on-chain. Private: set after `compute_winner_private` (winner/price committed; **not** the same as “reveal plaintext bids”). |
| `2` | **Settled** | Final; seller paid (and public path may have refunded losers). |

**Private-mode note:** During private flow, phase stays **Bidding** until `compute_winner_private` runs (after `reveal_end`), then moves to **Reveal** briefly before `settle_private` sets **Settled**. There is no `start_reveal` / `reveal_bid` for private auctions.

### Timeline (unix timestamps on `AuctionConfig`)

```
bidding_start ───────── commit_end ───────── reveal_end
     │                        │                    │
     │◄── commit window ─────►│                    │
     │   (public: commit_bid   │                    │
     │    private: submit_     │                    │
     │    encrypted_bid)       │                    │
     │                         │◄─ public only: ───►│
     │                         │  start_reveal →    │
     │                         │  reveal_bid        │
     │                         │  (in [commit_end,  │
     │                         │   reveal_end))     │
     │                         │                    │
     │                         │                    │◄─ settle_auction
     │                         │                    │   (public, clock ≥ reveal_end)
     │                         │                    │◄─ compute_winner_private
     │                         │                    │   (private, clock ≥ reveal_end)
     │                         │                    │◄─ settle_private (private)
```

**Invariants at init:** `bidding_start < commit_end < reveal_end` (enforced in `initialize_auction`).

### `AuctionConfig` fields (high level)

| Field | Role |
|-------|------|
| `seller`, `token_mint`, `vault` | Seller, SPL mint, auction vault ATA (PDA authority = auction) |
| `auction_id`, `phase`, `bump` | Identity and lifecycle |
| `bidding_start`, `commit_end`, `reveal_end` | Clock gates |
| `leader_bidder`, `leader_bid` | First-price leader (public: from reveals; private: from `compute_winner_private`) |
| `winner`, `winning_price`, `result_hash` | Final settlement outputs |
| `commit_count` | Public: commitments; private: number of `BidCiphertext` accounts |
| `reveal_count` | Public: successful reveals; unused for private semantics |
| `private_mode` | `false` = public path; `true` = ciphertext + TEE result path |
| `tee_winner_ready` | Private: `true` after `compute_winner_private` |

### `AuctionRuntime`

Mirrors `commit_count`, `reveal_count`, `leader_*` for **realtime UI** on ER; updated from base in `commit_bid` / `reveal_bid`. Intended to be **delegated** to MagicBlock ER for low-latency reads.

### `BidCommitment` (public)

Per-bidder PDA: `commitment` (32 bytes), `revealed`, `revealed` amount stored in `bid_amount` after reveal.

### `BidCiphertext` (private)

Per-bidder PDA: opaque `ciphertext` (up to `MAX_CIPHERTEXT_LEN` = 256), `ciphertext_len`. No bid amount on-chain.

---

## Cryptographic schemes (off-chain must match)

### Commitment (public)

```text
SHA256("sealed-auction:v1" || auction_id_le || bidder || amount_le || salt)
```

Implemented in `utils::hash_commitment`. Salt length ≤ `MAX_SALT_LEN` (64).

### Public settlement hash (`result_hash`)

```text
SHA256("result:v1" || auction_id_le || winner || winning_price_le ||
       commit_count_le || reveal_count_le || token_mint)
```

### Per-ciphertext digest (private)

```text
SHA256("cipher:v1" || auction_id_le || bidder || ciphertext_bytes[0..len])
```

### Aggregate (private)

1. For each `BidCiphertext`, compute digest as above.
2. Sort rows by **bidder pubkey** (lexicographic bytes).
3. `SHA256("agg:v1" || digest[0] || digest[1] || ...)` in sorted order.

Must match `aggregate_digest` passed to `compute_winner_private`.

### Private result hash

```text
SHA256("result:private:v1" || auction_id_le || winner || winning_price_le || aggregate_digest)
```

---

## Instructions — reference

### `initialize_auction`

| | |
|--|--|
| **Args** | `auction_id`, `bidding_start`, `commit_end`, `reveal_end`, `private_mode` |
| **Creates** | `AuctionConfig`, `AuctionRuntime`, vault ATA |
| **Sets** | `phase = Bidding`, counters zero, `tee_winner_ready = false` |

### `commit_bid` (public only)

| | |
|--|--|
| **Requires** | `!private_mode`, `phase == Bidding`, `bidding_start ≤ now < commit_end` |
| **Creates** | `BidCommitment` (init) |
| **Effect** | Stores 32-byte commitment; increments `commit_count`; mirrors runtime |

### `start_reveal` (public only)

| | |
|--|--|
| **Requires** | `!private_mode`, `phase == Bidding`, `now ≥ commit_end` |
| **Effect** | `phase = Reveal` |

### `reveal_bid` (public only)

| | |
|--|--|
| **Requires** | `!private_mode`, `phase == Reveal`, `commit_end ≤ now < reveal_end`, `bid_amount ≥ MIN_BID` (1), commitment matches, not already revealed |
| **CPI** | SPL token transfer `bid_amount` from bidder ATA → vault |
| **Effect** | Updates leader if higher; `reveal_count++`; mirrors runtime |

### `settle_auction` (public only)

| | |
|--|--|
| **Requires** | `!private_mode`, `phase == Reveal`, `now ≥ reveal_end`, `reveal_count > 0`, `leader_bidder` non-default |
| **Accounts** | `authority`, `auction`, `vault`, `seller_token`, `token_program` |
| **CPI** | Pay seller `winning_price` from vault (PDA signer) |
| **Remaining accounts** | Pairs: `(BidCommitment, bidder_token_ATA)` for each **losing** revealed bid; refunds `bid_amount` from vault to bidder. Winner is skipped (no refund). Length must be even. |
| **Effect** | `phase = Settled`, `winner`, `winning_price`, `result_hash` (`result_hash_v1`) |

### `delegate_runtime` / `commit_runtime` / `undelegate_runtime`

MagicBlock ER delegation for **`AuctionRuntime`** PDA seeds `["runtime", auction_id_le]`. Uses `ephemeral-rollups-sdk` CPI helpers (`delegate_runtime`, `commit_accounts`, `commit_and_undelegate_accounts`). Optional validator in `remaining_accounts` for delegate.

### `submit_encrypted_bid` (private only)

| | |
|--|--|
| **Requires** | `private_mode`, `phase == Bidding`, `bidding_start ≤ now < commit_end`, `len(ciphertext) ≤ 256` |
| **Creates** | `BidCiphertext` |
| **Effect** | `commit_count++` |

### `compute_winner_private` (private only)

| | |
|--|--|
| **Requires** | `private_mode`, `phase == Bidding`, `now ≥ reveal_end`, `winning_price > 0` |
| **Remaining accounts** | One account per bid: **every** `BidCiphertext` for this auction; count **must equal** `commit_count`. Each must deserialize and match expected PDA seeds. |
| **Verifies** | Recomputes aggregate from on-chain ciphertexts; must equal `aggregate_digest`. |
| **Effect** | `phase = Reveal`, sets winner/price/`result_hash` (`result_hash_private_v1`), `tee_winner_ready = true` |

**Trust model:** `winner` and `winning_price` are **inputs** (e.g. from TEE). On-chain binding is to the **ciphertext set** via `aggregate_digest`, not to a proof of decryption inside this program.

### `settle_private` (private only)

| | |
|--|--|
| **Requires** | `private_mode`, `tee_winner_ready`, `phase == Reveal` |
| **CPI** | Pay seller `winning_price` from vault |
| **Effect** | `phase = Settled` (no loser refund loop in this instruction; fund vault accordingly for your product) |

---

## Events

| Event | When |
|-------|------|
| `AuctionInitialized` | After init |
| `BidCommitted` | After `commit_bid` |
| `BidRevealed` | After `reveal_bid` |
| `PhaseChanged` | After `start_reveal` |
| `AuctionSettled` | After `settle_auction` |
| `PrivateWinnerComputed` | After `compute_winner_private` |

---

## Error codes

See `errors.rs` (`SealedAuctionError`). Common codes: phase mismatch, windows closed, commitment mismatch, `SettlementTooEarly` (6009), `AggregateMismatch`, `WinnerNotComputed`, `PrivateModeMismatch`.

---

## Integration guide

### 1. Anchor client

- Load IDL: `target/idl/sealed_auction_program.json` or generated TypeScript types.
- `Program` id = program id from `declare_id!` / IDL `metadata` / `address` field.

### 2. PDAs (JS / `Pubkey.findProgramAddressSync`)

- Auction: `seeds = [Buffer.from("auction"), u64_le(auction_id)]`
- Runtime: `seeds = [Buffer.from("runtime"), u64_le(auction_id)]`
- Bid: `seeds = [Buffer.from("bid"), u64_le(auction_id), bidder.toBuffer()]`
- Bid cipher: `seeds = [Buffer.from("bid_cipher"), u64_le(auction_id), bidder.toBuffer()]`

### 3. Public flow (minimal)

1. `initialize_auction` (seller signs; pass mint, times, `private_mode: false`).
2. Bidders `commit_bid` with `hash_commitment(...)` as 32-byte array.
3. `start_reveal` after `commit_end`.
4. Bidders `reveal_bid` with amount + salt (vault must receive escrow).
5. After `reveal_end`, `settle_auction` with `remaining_accounts` pairs for refunds (see above).

### 4. Private flow (minimal)

1. `initialize_auction` with `private_mode: true`.
2. Bidders `submit_encrypted_bid` during commit window.
3. Off-chain / TEE: compute winner, price, and `aggregate_digest` over all ciphertext PDAs (sorted-digest algorithm above).
4. After `reveal_end`, `compute_winner_private` with `remaining_accounts` = all `BidCiphertext` accounts for the auction.
5. `settle_private` (ensure vault holds ≥ `winning_price`).

### 5. Dual RPC (MagicBlock)

- **Base:** delegate / init / reads that must land on L1.
- **ER:** optional `delegate_runtime` then subscribe to `AuctionRuntime` on ER WebSocket for live leader/counts.

### 6. Testing tips

- Leave slack between `reveal_end` and `settle_*` vs wall-clock latency.
- For `settle_auction`, order `remaining_accounts` as `(bid_pda, bidder_ata)` pairs for losers only.

---

## Dependencies

- `anchor-lang` / `anchor-spl` (see `Cargo.toml`)
- `ephemeral-rollups-sdk` with `anchor` features

---

## More docs

- Workspace: **[../../README.md](../../README.md)**, **[../../DEV.md](../../DEV.md)**
