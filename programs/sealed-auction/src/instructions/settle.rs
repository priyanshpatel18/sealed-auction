use anchor_lang::prelude::*;

use crate::errors::SealedAuctionError;
use crate::state::{AuctionPhase, AuctionSettled, BidCommitment};
use crate::utils::{result_hash_v1, transfer_lamports};
use crate::SettleAuction;

pub fn settle_auction_handler(ctx: Context<SettleAuction>, auction_id: u64) -> Result<()> {
    require!(!ctx.accounts.auction.private_mode, SealedAuctionError::PrivateModeMismatch);
    require!(
        ctx.accounts.auction.phase == AuctionPhase::Reveal as u8,
        SealedAuctionError::AuctionPhaseMismatch
    );
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= ctx.accounts.auction.reveal_end,
        SealedAuctionError::SettlementTooEarly
    );
    require!(ctx.accounts.auction.reveal_count > 0, SealedAuctionError::NoRevealedBids);

    let winner = ctx.accounts.auction.leader_bidder;
    let winning_price = ctx.accounts.auction.leader_bid;
    require!(winner != Pubkey::default(), SealedAuctionError::NoRevealedBids);

    let commit_count = ctx.accounts.auction.commit_count;
    let reveal_count = ctx.accounts.auction.reveal_count;

    let result_hash = result_hash_v1(
        auction_id,
        &winner,
        winning_price,
        commit_count,
        reveal_count,
    );

    let rent = Rent::get()?;
    let vault_min = rent.minimum_balance(0);

    let rem = ctx.remaining_accounts;
    require!(rem.len() % 2 == 0, SealedAuctionError::NoRevealedBids);

    let mut total_refund: u64 = 0;
    let mut i = 0;
    while i < rem.len() {
        let bid_ai = &rem[i];
        let bidder_wallet = &rem[i + 1];
        i += 2;

        require!(bid_ai.owner == &crate::ID, SealedAuctionError::CommitmentMismatch);

        let refund_amt: Option<u64> = {
            let bid_ref = bid_ai.try_borrow_data()?;
            let mut bid_data: &[u8] = &bid_ref;
            let bid = BidCommitment::try_deserialize(&mut bid_data)?;

            require!(bid.auction_id == auction_id, SealedAuctionError::CommitmentMismatch);
            require!(bid.revealed, SealedAuctionError::CommitmentMismatch);
            require!(
                bidder_wallet.key() == bid.bidder,
                SealedAuctionError::CommitmentMismatch
            );
            if bid.bidder == winner {
                None
            } else {
                let amt = bid.bid_amount;
                if amt == 0 {
                    None
                } else {
                    Some(amt)
                }
            }
        };

        if let Some(amt) = refund_amt {
            total_refund = total_refund
                .checked_add(amt)
                .ok_or(SealedAuctionError::BidOutOfRange)?;
        }
    }

    let vault_lamports = ctx.accounts.vault.to_account_info().lamports();
    let total_out = winning_price
        .checked_add(total_refund)
        .ok_or(SealedAuctionError::BidOutOfRange)?;
    let need = total_out
        .checked_add(vault_min)
        .ok_or(SealedAuctionError::BidOutOfRange)?;
    require!(
        vault_lamports >= need,
        SealedAuctionError::InsufficientFundsForDeposit
    );

    transfer_lamports(
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.seller.to_account_info(),
        winning_price,
    )?;

    let mut j = 0;
    while j < rem.len() {
        let bid_ai = &rem[j];
        let bidder_wallet = &rem[j + 1];
        j += 2;

        let refund_amt: Option<u64> = {
            let bid_ref = bid_ai.try_borrow_data()?;
            let mut bid_data: &[u8] = &bid_ref;
            let bid = BidCommitment::try_deserialize(&mut bid_data)?;

            require!(bid.auction_id == auction_id, SealedAuctionError::CommitmentMismatch);
            require!(bid.revealed, SealedAuctionError::CommitmentMismatch);
            require!(
                bidder_wallet.key() == bid.bidder,
                SealedAuctionError::CommitmentMismatch
            );
            if bid.bidder == winner {
                None
            } else {
                let amt = bid.bid_amount;
                if amt == 0 {
                    None
                } else {
                    Some(amt)
                }
            }
        };

        let Some(refund_amt) = refund_amt else {
            continue;
        };
        if refund_amt == 0 {
            continue;
        }

        transfer_lamports(
            &ctx.accounts.vault.to_account_info(),
            bidder_wallet,
            refund_amt,
        )?;
    }

    let auction = &mut ctx.accounts.auction;
    auction.phase = AuctionPhase::Settled as u8;
    auction.winner = winner;
    auction.winning_price = winning_price;
    auction.result_hash = result_hash;

    emit!(AuctionSettled {
        auction_id,
        winner,
        winning_price,
        result_hash,
    });

    Ok(())
}
