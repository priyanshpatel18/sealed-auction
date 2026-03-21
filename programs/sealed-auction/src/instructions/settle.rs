use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{self, TokenAccount, Transfer as SplTransfer};
use anchor_spl::token::spl_token;

use crate::errors::SealedAuctionError;
use crate::state::{AuctionPhase, AuctionSettled, BidCommitment, AUCTION_SEED};
use crate::utils::result_hash_v1;
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

    let mint = ctx.accounts.auction.token_mint;
    let commit_count = ctx.accounts.auction.commit_count;
    let reveal_count = ctx.accounts.auction.reveal_count;

    let result_hash = result_hash_v1(
        auction_id,
        &winner,
        winning_price,
        commit_count,
        reveal_count,
        &mint,
    );

    let bump = ctx.accounts.auction.bump;
    let seeds: &[&[u8]] = &[AUCTION_SEED, &auction_id.to_le_bytes(), &[bump]];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    let pay_seller = SplTransfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.seller_token.to_account_info(),
        authority: ctx.accounts.auction.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            pay_seller,
            signer_seeds,
        ),
        winning_price,
    )?;

    let rem = ctx.remaining_accounts;
    require!(rem.len() % 2 == 0, SealedAuctionError::NoRevealedBids);

    let token_program_key = ctx.accounts.token_program.key();

    let mut i = 0;
    while i < rem.len() {
        let bid_ai = &rem[i];
        let token_ai = &rem[i + 1];
        i += 2;

        require!(bid_ai.owner == &crate::ID, SealedAuctionError::CommitmentMismatch);

        // All `try_borrow_data` Refs must drop before CPI — otherwise AccountBorrowFailed.
        let refund_amt: Option<u64> = {
            let bid_ref = bid_ai.try_borrow_data()?;
            let mut bid_data: &[u8] = &bid_ref;
            let bid = BidCommitment::try_deserialize(&mut bid_data)?;

            require!(bid.auction_id == auction_id, SealedAuctionError::CommitmentMismatch);
            require!(bid.revealed, SealedAuctionError::CommitmentMismatch);
            if bid.bidder == winner {
                None
            } else {
                let token_ref = token_ai.try_borrow_data()?;
                let mut td: &[u8] = &token_ref;
                let ta = TokenAccount::try_deserialize(&mut td)?;
                require!(ta.owner == bid.bidder, SealedAuctionError::InsufficientFundsForDeposit);
                require!(ta.mint == mint, SealedAuctionError::InvalidMint);
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

        let ix = spl_token::instruction::transfer(
            &token_program_key,
            &ctx.accounts.vault.key(),
            &token_ai.key(),
            &ctx.accounts.auction.key(),
            &[],
            refund_amt,
        )?;

        let from_ai: AccountInfo<'static> = unsafe { std::mem::transmute(ctx.accounts.vault.to_account_info()) };
        let to_ai: AccountInfo<'static> = unsafe { std::mem::transmute(token_ai.clone()) };
        let auth_ai: AccountInfo<'static> = unsafe { std::mem::transmute(ctx.accounts.auction.to_account_info()) };

        invoke_signed(&ix, &[from_ai, to_ai, auth_ai], signer_seeds)?;
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
