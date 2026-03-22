use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

use crate::state::{AuctionConfig, MAX_SALT_LEN};

pub fn hash_commitment(auction_id: u64, bidder: &Pubkey, amount: u64, salt: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"sealed-auction:v1");
    hasher.update(&auction_id.to_le_bytes());
    hasher.update(bidder.as_ref());
    hasher.update(&amount.to_le_bytes());
    hasher.update(salt);
    let out = hasher.finalize();
    out.into()
}

/// Settlement hash for native-SOL auctions (fixed domain suffix replaces SPL mint).
pub fn result_hash_v1(
    auction_id: u64,
    winner: &Pubkey,
    winning_price: u64,
    commit_count: u32,
    reveal_count: u32,
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"result:v1");
    hasher.update(&auction_id.to_le_bytes());
    hasher.update(winner.as_ref());
    hasher.update(&winning_price.to_le_bytes());
    hasher.update(&commit_count.to_le_bytes());
    hasher.update(&reveal_count.to_le_bytes());
    hasher.update(&[0u8; 32]);
    let out = hasher.finalize();
    out.into()
}

pub fn ciphertext_digest_v1(auction_id: u64, bidder: &Pubkey, ciphertext: &[u8], len: usize) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"cipher:v1");
    hasher.update(&auction_id.to_le_bytes());
    hasher.update(bidder.as_ref());
    hasher.update(&ciphertext[..len]);
    let out = hasher.finalize();
    out.into()
}

/// Deterministic aggregate over per-bid ciphertext digests (sorted by bidder pubkey).
pub fn aggregate_ciphertext_digests_v1(sorted_digests: &[[u8; 32]]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"agg:v1");
    for d in sorted_digests {
        hasher.update(d);
    }
    let out = hasher.finalize();
    out.into()
}

pub fn result_hash_private_v1(
    auction_id: u64,
    winner: &Pubkey,
    winning_price: u64,
    ciphertext_digest: &[u8; 32],
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"result:private:v1");
    hasher.update(&auction_id.to_le_bytes());
    hasher.update(winner.as_ref());
    hasher.update(&winning_price.to_le_bytes());
    hasher.update(ciphertext_digest.as_ref());
    let out = hasher.finalize();
    out.into()
}

pub fn validate_salt(salt: &[u8]) -> Result<()> {
    require!(
        salt.len() <= MAX_SALT_LEN,
        crate::errors::SealedAuctionError::SaltTooLong
    );
    Ok(())
}

pub fn update_runtime_mirror(runtime: &mut crate::state::AuctionRuntime, auction: &AuctionConfig) {
    runtime.leader_bid = auction.leader_bid;
    runtime.leader_bidder = auction.leader_bidder;
    runtime.commit_count = auction.commit_count;
    runtime.reveal_count = auction.reveal_count;
}

/// Move lamports between accounts without the System Program CPI. The vault PDA is program-owned
/// (`init`); System Program `transfer` cannot debit it — only credit into it from user wallets.
pub fn transfer_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
    **from.try_borrow_mut_lamports()? = from
        .lamports()
        .checked_sub(amount)
        .ok_or(crate::errors::SealedAuctionError::InsufficientFundsForDeposit)?;
    **to.try_borrow_mut_lamports()? = to
        .lamports()
        .checked_add(amount)
        .ok_or(crate::errors::SealedAuctionError::BidOutOfRange)?;
    Ok(())
}
