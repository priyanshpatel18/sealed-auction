mod errors;
mod instructions;
mod state;
mod utils;

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

use instructions::{
    commit_bid_handler, commit_runtime_handler, compute_winner_private_handler,
    delegate_runtime_handler, initialize_auction_handler, reveal_bid_handler,
    settle_auction_handler, settle_private_handler, start_reveal_handler,
    submit_encrypted_bid_handler, undelegate_runtime_handler,
};

declare_id!("9msixs2rRpafs5RaCbLxTeNEiZbvg5Qux3L8qENEN4JZ");

#[ephemeral]
#[program]
pub mod sealed_auction_program {
    use super::*;

    pub fn initialize_auction(
        ctx: Context<InitializeAuction>,
        auction_id: u64,
        bidding_start: i64,
        commit_end: i64,
        reveal_end: i64,
        private_mode: bool,
        metadata_uri: String,
    ) -> Result<()> {
        initialize_auction_handler(
            ctx,
            auction_id,
            bidding_start,
            commit_end,
            reveal_end,
            private_mode,
            metadata_uri,
        )
    }

    pub fn commit_bid(
        ctx: Context<CommitBid>,
        auction_id: u64,
        commitment: [u8; 32],
    ) -> Result<()> {
        commit_bid_handler(ctx, auction_id, commitment)
    }

    pub fn start_reveal(ctx: Context<StartReveal>, auction_id: u64) -> Result<()> {
        start_reveal_handler(ctx, auction_id)
    }

    pub fn reveal_bid(
        ctx: Context<RevealBid>,
        auction_id: u64,
        bid_amount: u64,
        salt: Vec<u8>,
    ) -> Result<()> {
        reveal_bid_handler(ctx, auction_id, bid_amount, salt)
    }

    pub fn settle_auction(ctx: Context<SettleAuction>, auction_id: u64) -> Result<()> {
        settle_auction_handler(ctx, auction_id)
    }

    pub fn delegate_runtime(ctx: Context<DelegateRuntime>, auction_id: u64) -> Result<()> {
        delegate_runtime_handler(ctx, auction_id)
    }

    pub fn commit_runtime(ctx: Context<CommitRuntime>, auction_id: u64) -> Result<()> {
        commit_runtime_handler(ctx, auction_id)
    }

    pub fn undelegate_runtime(ctx: Context<UndelegateRuntime>, auction_id: u64) -> Result<()> {
        undelegate_runtime_handler(ctx, auction_id)
    }

    pub fn submit_encrypted_bid(
        ctx: Context<SubmitEncryptedBid>,
        auction_id: u64,
        ciphertext: Vec<u8>,
    ) -> Result<()> {
        submit_encrypted_bid_handler(ctx, auction_id, ciphertext)
    }

    pub fn compute_winner_private(
        ctx: Context<ComputeWinnerPrivate>,
        auction_id: u64,
        winner: Pubkey,
        winning_price: u64,
        aggregate_digest: [u8; 32],
    ) -> Result<()> {
        compute_winner_private_handler(ctx, auction_id, winner, winning_price, aggregate_digest)
    }

    pub fn settle_private(ctx: Context<SettlePrivate>, auction_id: u64) -> Result<()> {
        settle_private_handler(ctx, auction_id)
    }
}

include!("accounts.rs");
