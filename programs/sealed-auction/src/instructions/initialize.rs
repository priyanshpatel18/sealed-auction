use anchor_lang::prelude::*;

use crate::errors::SealedAuctionError;
use crate::state::{AuctionPhase, AuctionInitialized};
use crate::InitializeAuction;

pub fn initialize_auction_handler(
    ctx: Context<InitializeAuction>,
    auction_id: u64,
    bidding_start: i64,
    commit_end: i64,
    reveal_end: i64,
    private_mode: bool,
    metadata_uri: String,
) -> Result<()> {
    require!(metadata_uri.len() <= 256, SealedAuctionError::MetadataUriTooLong);
    require!(bidding_start < commit_end, SealedAuctionError::CommitWindowClosed);
    require!(commit_end < reveal_end, SealedAuctionError::RevealWindowClosed);
    let clock = Clock::get()?;

    let auction = &mut ctx.accounts.auction;
    auction.seller = ctx.accounts.seller.key();
    auction.vault = ctx.accounts.vault.key();
    auction.auction_id = auction_id;
    auction.phase = AuctionPhase::Bidding as u8;
    auction.bidding_start = bidding_start;
    auction.commit_end = commit_end;
    auction.reveal_end = reveal_end;
    auction.bump = ctx.bumps.auction;
    auction.leader_bidder = Pubkey::default();
    auction.leader_bid = 0;
    auction.winner = Pubkey::default();
    auction.winning_price = 0;
    auction.result_hash = [0u8; 32];
    auction.commit_count = 0;
    auction.reveal_count = 0;
    auction.private_mode = private_mode;
    auction.tee_winner_ready = false;
    auction.metadata_uri = metadata_uri;

    let runtime = &mut ctx.accounts.runtime;
    runtime.auction_id = auction_id;
    runtime.leader_bid = 0;
    runtime.leader_bidder = Pubkey::default();
    runtime.commit_count = 0;
    runtime.reveal_count = 0;
    runtime.bump = ctx.bumps.runtime;

    emit!(AuctionInitialized {
        auction_id,
        seller: auction.seller,
        private_mode,
    });

    msg!(
        "Auction {} init clock={} start={}",
        auction_id,
        clock.unix_timestamp,
        bidding_start
    );
    Ok(())
}
