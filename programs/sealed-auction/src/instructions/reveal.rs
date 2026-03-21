use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer as SplTransfer};

use crate::errors::SealedAuctionError;
use crate::state::{AuctionPhase, BidRevealed, PhaseChanged};
use crate::utils::{hash_commitment, update_runtime_mirror, validate_salt};
use crate::{RevealBid, StartReveal};

pub const MIN_BID: u64 = 1;

pub fn start_reveal_handler(ctx: Context<StartReveal>, auction_id: u64) -> Result<()> {
    let auction = &mut ctx.accounts.auction;
    require!(!auction.private_mode, SealedAuctionError::PrivateModeMismatch);
    require!(
        auction.phase == AuctionPhase::Bidding as u8,
        SealedAuctionError::AuctionPhaseMismatch
    );
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= auction.commit_end,
        SealedAuctionError::RevealNotAllowed
    );

    auction.phase = AuctionPhase::Reveal as u8;
    emit!(PhaseChanged {
        auction_id,
        new_phase: AuctionPhase::Reveal as u8,
    });
    Ok(())
}

pub fn reveal_bid_handler(
    ctx: Context<RevealBid>,
    auction_id: u64,
    bid_amount: u64,
    salt: Vec<u8>,
) -> Result<()> {
    validate_salt(&salt)?;
    let auction = &mut ctx.accounts.auction;
    require!(!auction.private_mode, SealedAuctionError::PrivateModeMismatch);
    require!(
        auction.phase == AuctionPhase::Reveal as u8,
        SealedAuctionError::AuctionPhaseMismatch
    );
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= auction.commit_end && clock.unix_timestamp < auction.reveal_end,
        SealedAuctionError::RevealWindowClosed
    );
    require!(bid_amount >= MIN_BID, SealedAuctionError::BidOutOfRange);

    let bid = &mut ctx.accounts.bid;
    require!(!bid.revealed, SealedAuctionError::BidAlreadyRevealed);
    require!(
        bid.bidder == ctx.accounts.bidder.key(),
        SealedAuctionError::CommitmentMismatch
    );

    let expected = hash_commitment(auction_id, &bid.bidder, bid_amount, &salt);
    require!(
        expected == bid.commitment,
        SealedAuctionError::CommitmentMismatch
    );

    let cpi_accounts = SplTransfer {
        from: ctx.accounts.bidder_token.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.bidder.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, bid_amount)?;

    bid.revealed = true;
    bid.bid_amount = bid_amount;

    if bid_amount > auction.leader_bid {
        auction.leader_bid = bid_amount;
        auction.leader_bidder = bid.bidder;
    }

    auction.reveal_count = auction
        .reveal_count
        .checked_add(1)
        .ok_or(SealedAuctionError::BidOutOfRange)?;

    update_runtime_mirror(&mut ctx.accounts.runtime, auction);

    emit!(BidRevealed {
        auction_id,
        bidder: bid.bidder,
        bid_amount,
    });
    Ok(())
}
