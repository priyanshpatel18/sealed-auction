use anchor_lang::prelude::*;

use crate::errors::SealedAuctionError;
use crate::state::{AuctionPhase, BidCommitted};
use crate::utils::update_runtime_mirror;
use crate::CommitBid;

pub fn commit_bid_handler(
    ctx: Context<CommitBid>,
    auction_id: u64,
    commitment: [u8; 32],
) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require!(!auction.private_mode, SealedAuctionError::PrivateModeMismatch);
    require!(
        auction.phase == AuctionPhase::Bidding as u8,
        SealedAuctionError::AuctionPhaseMismatch
    );
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= auction.bidding_start && clock.unix_timestamp < auction.commit_end,
        SealedAuctionError::CommitWindowClosed
    );

    let bid = &mut ctx.accounts.bid;
    bid.auction_id = auction_id;
    bid.bidder = ctx.accounts.bidder.key();
    bid.commitment = commitment;
    bid.revealed = false;
    bid.bid_amount = 0;
    bid.bump = ctx.bumps.bid;

    auction.commit_count = auction
        .commit_count
        .checked_add(1)
        .ok_or(SealedAuctionError::BidOutOfRange)?;

    update_runtime_mirror(&mut ctx.accounts.runtime, auction);

    emit!(BidCommitted {
        auction_id,
        bidder: bid.bidder,
    });
    Ok(())
}
