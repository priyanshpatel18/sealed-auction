// All `#[derive(Accounts)]` structs live at crate root so Anchor's `#[program]` client re-exports
// (`pub use crate::__client_accounts_*`) resolve correctly.

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use ephemeral_rollups_sdk::anchor::{commit, delegate};

use crate::errors::SealedAuctionError;
use crate::state::{
    AuctionConfig, AuctionRuntime, BidCiphertext, BidCommitment, AUCTION_SEED, BID_CIPHER_SEED,
    BID_SEED, RUNTIME_SEED,
};

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct InitializeAuction<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = seller,
        space = 8 + AuctionConfig::INIT_SPACE,
        seeds = [AUCTION_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump
    )]
    pub auction: Account<'info, AuctionConfig>,
    #[account(
        init,
        payer = seller,
        space = 8 + AuctionRuntime::INIT_SPACE,
        seeds = [RUNTIME_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump
    )]
    pub runtime: Account<'info, AuctionRuntime>,
    #[account(
        init,
        payer = seller,
        associated_token::mint = token_mint,
        associated_token::authority = auction,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct CommitBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(
        mut,
        seeds = [AUCTION_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, AuctionConfig>,
    #[account(
        init,
        payer = bidder,
        space = 8 + BidCommitment::INIT_SPACE,
        seeds = [BID_SEED.as_ref(), &auction_id.to_le_bytes(), bidder.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, BidCommitment>,
    #[account(
        mut,
        seeds = [RUNTIME_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = runtime.bump
    )]
    pub runtime: Account<'info, AuctionRuntime>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct StartReveal<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [AUCTION_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, AuctionConfig>,
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct RevealBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(
        mut,
        seeds = [AUCTION_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, AuctionConfig>,
    #[account(
        mut,
        seeds = [BID_SEED.as_ref(), &auction_id.to_le_bytes(), bidder.key().as_ref()],
        bump = bid.bump
    )]
    pub bid: Account<'info, BidCommitment>,
    #[account(
        mut,
        seeds = [RUNTIME_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = runtime.bump
    )]
    pub runtime: Account<'info, AuctionRuntime>,
    #[account(
        mut,
        constraint = bidder_token.owner == bidder.key() @ SealedAuctionError::InsufficientFundsForDeposit,
        constraint = bidder_token.mint == auction.token_mint @ SealedAuctionError::InvalidMint
    )]
    pub bidder_token: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault.key() == auction.vault @ SealedAuctionError::InvalidMint
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct SettleAuction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [AUCTION_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, AuctionConfig>,
    #[account(
        mut,
        constraint = vault.key() == auction.vault @ SealedAuctionError::InvalidMint
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = seller_token.owner == auction.seller @ SealedAuctionError::InvalidMint,
        constraint = seller_token.mint == auction.token_mint @ SealedAuctionError::InvalidMint
    )]
    pub seller_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct DelegateRuntime<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, del, seeds = [RUNTIME_SEED.as_ref(), &auction_id.to_le_bytes()], bump)]
    pub runtime: AccountInfo<'info>,
}

#[commit]
#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct CommitRuntime<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [RUNTIME_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = runtime.bump
    )]
    pub runtime: Account<'info, AuctionRuntime>,
}

#[commit]
#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct UndelegateRuntime<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [RUNTIME_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = runtime.bump
    )]
    pub runtime: Account<'info, AuctionRuntime>,
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct SubmitEncryptedBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(
        mut,
        seeds = [AUCTION_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, AuctionConfig>,
    #[account(
        init,
        payer = bidder,
        space = 8 + BidCiphertext::INIT_SPACE,
        seeds = [BID_CIPHER_SEED.as_ref(), &auction_id.to_le_bytes(), bidder.key().as_ref()],
        bump
    )]
    pub bid_cipher: Account<'info, BidCiphertext>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct ComputeWinnerPrivate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [AUCTION_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, AuctionConfig>,
}

#[derive(Accounts)]
#[instruction(auction_id: u64)]
pub struct SettlePrivate<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [AUCTION_SEED.as_ref(), &auction_id.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, AuctionConfig>,
    #[account(
        mut,
        constraint = vault.key() == auction.vault @ SealedAuctionError::InvalidMint
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = seller_token.owner == auction.seller @ SealedAuctionError::InvalidMint,
        constraint = seller_token.mint == auction.token_mint @ SealedAuctionError::InvalidMint
    )]
    pub seller_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
