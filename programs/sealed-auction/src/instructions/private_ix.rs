use anchor_lang::prelude::*;

use crate::errors::SealedAuctionError;
use crate::state::{AuctionPhase, BidCiphertext, PrivateWinnerComputed, BID_CIPHER_SEED};
use crate::utils::{
    aggregate_ciphertext_digests_v1, ciphertext_digest_v1, result_hash_private_v1, transfer_lamports,
};
use crate::{ComputeWinnerPrivate, SettlePrivate, SubmitEncryptedBid};

pub fn submit_encrypted_bid_handler(
    ctx: Context<SubmitEncryptedBid>,
    auction_id: u64,
    ciphertext: Vec<u8>,
) -> Result<()> {
    require!(
        ciphertext.len() <= crate::state::MAX_CIPHERTEXT_LEN,
        SealedAuctionError::CiphertextTooLong
    );
    let auction = &mut ctx.accounts.auction;
    require!(auction.private_mode, SealedAuctionError::PrivateModeMismatch);
    require!(
        auction.phase == AuctionPhase::Bidding as u8,
        SealedAuctionError::AuctionPhaseMismatch
    );
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= auction.bidding_start && clock.unix_timestamp < auction.commit_end,
        SealedAuctionError::CommitWindowClosed
    );

    let bc = &mut ctx.accounts.bid_cipher;
    bc.auction_id = auction_id;
    bc.bidder = ctx.accounts.bidder.key();
    bc.ciphertext_len = ciphertext.len() as u16;
    bc.ciphertext = [0u8; crate::state::MAX_CIPHERTEXT_LEN];
    bc.ciphertext[..ciphertext.len()].copy_from_slice(&ciphertext);
    bc.bump = ctx.bumps.bid_cipher;

    auction.commit_count = auction
        .commit_count
        .checked_add(1)
        .ok_or(SealedAuctionError::BidOutOfRange)?;
    Ok(())
}

/// Record TEE-computed winner. `aggregate_digest` must match all `BidCiphertext` accounts passed
/// in `remaining_accounts` (sorted by bidder, same hash as [`aggregate_ciphertext_digests_v1`]).
pub fn compute_winner_private_handler(
    ctx: Context<ComputeWinnerPrivate>,
    auction_id: u64,
    winner: Pubkey,
    winning_price: u64,
    aggregate_digest: [u8; 32],
) -> Result<()> {
    let commit_count = ctx.accounts.auction.commit_count;
    require!(ctx.accounts.auction.private_mode, SealedAuctionError::PrivateModeMismatch);
    require!(
        ctx.accounts.auction.phase == AuctionPhase::Bidding as u8,
        SealedAuctionError::AuctionPhaseMismatch
    );
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= ctx.accounts.auction.reveal_end,
        SealedAuctionError::SettlementTooEarly
    );
    require!(winning_price > 0, SealedAuctionError::BidOutOfRange);

    let rem = ctx.remaining_accounts;
    require!(!rem.is_empty(), SealedAuctionError::NoRevealedBids);
    require!(
        rem.len() == commit_count as usize,
        SealedAuctionError::AggregateMismatch
    );

    let mut rows: Vec<([u8; 32], Pubkey)> = Vec::with_capacity(rem.len());
    for ai in rem.iter() {
        require!(ai.owner == &crate::ID, SealedAuctionError::CommitmentMismatch);
        let data = ai.try_borrow_data()?;
        let mut slice: &[u8] = &data;
        let bc = BidCiphertext::try_deserialize(&mut slice)?;
        require!(bc.auction_id == auction_id, SealedAuctionError::CommitmentMismatch);
        let (expected_pda, _) = Pubkey::find_program_address(
            &[
                BID_CIPHER_SEED,
                &auction_id.to_le_bytes(),
                bc.bidder.as_ref(),
            ],
            ctx.program_id,
        );
        require!(ai.key() == expected_pda, SealedAuctionError::CommitmentMismatch);
        let len = bc.ciphertext_len as usize;
        let d = ciphertext_digest_v1(auction_id, &bc.bidder, &bc.ciphertext[..], len);
        rows.push((d, bc.bidder));
    }

    rows.sort_by(|a, b| a.1.to_bytes().cmp(&b.1.to_bytes()));
    let sorted: Vec<[u8; 32]> = rows.into_iter().map(|(d, _)| d).collect();
    let computed = aggregate_ciphertext_digests_v1(&sorted);
    require!(
        computed == aggregate_digest,
        SealedAuctionError::AggregateMismatch
    );

    let auction = &mut ctx.accounts.auction;
    let result_hash = result_hash_private_v1(auction_id, &winner, winning_price, &aggregate_digest);

    auction.phase = AuctionPhase::Reveal as u8;
    auction.leader_bidder = winner;
    auction.leader_bid = winning_price;
    auction.winner = winner;
    auction.winning_price = winning_price;
    auction.result_hash = result_hash;
    auction.tee_winner_ready = true;

    emit!(PrivateWinnerComputed {
        auction_id,
        winner,
        winning_price,
        result_hash,
    });
    Ok(())
}

/// Pay seller from vault. Deposits for private mode must be provisioned separately (e.g. direct vault transfers in demo).
pub fn settle_private_handler(ctx: Context<SettlePrivate>, _auction_id: u64) -> Result<()> {
    require!(ctx.accounts.auction.private_mode, SealedAuctionError::PrivateModeMismatch);
    require!(ctx.accounts.auction.tee_winner_ready, SealedAuctionError::WinnerNotComputed);
    require!(
        ctx.accounts.auction.phase == AuctionPhase::Reveal as u8,
        SealedAuctionError::AuctionPhaseMismatch
    );

    let winning_price = ctx.accounts.auction.winning_price;
    transfer_lamports(
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.seller.to_account_info(),
        winning_price,
    )?;

    let auction = &mut ctx.accounts.auction;
    auction.phase = AuctionPhase::Settled as u8;
    Ok(())
}
