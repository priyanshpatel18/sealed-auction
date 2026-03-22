use anchor_lang::prelude::*;

pub const AUCTION_SEED: &[u8] = b"auction";
pub const RUNTIME_SEED: &[u8] = b"runtime";
pub const BID_SEED: &[u8] = b"bid";
pub const BID_CIPHER_SEED: &[u8] = b"bid_cipher";
pub const VAULT_SEED: &[u8] = b"vault";

pub const MAX_SALT_LEN: usize = 64;
pub const MAX_CIPHERTEXT_LEN: usize = 256;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
#[repr(u8)]
pub enum AuctionPhase {
    Bidding = 0,
    Reveal = 1,
    Settled = 2,
}

impl Default for AuctionPhase {
    fn default() -> Self {
        AuctionPhase::Bidding
    }
}

#[account]
#[derive(InitSpace)]
pub struct AuctionConfig {
    pub seller: Pubkey,
    pub vault: Pubkey,
    pub auction_id: u64,
    pub phase: u8,
    pub bidding_start: i64,
    pub commit_end: i64,
    pub reveal_end: i64,
    pub bump: u8,
    /// Leader during reveal (first-price).
    pub leader_bidder: Pubkey,
    pub leader_bid: u64,
    pub winner: Pubkey,
    pub winning_price: u64,
    pub result_hash: [u8; 32],
    pub commit_count: u32,
    pub reveal_count: u32,
    pub private_mode: bool,
    /// TEE stage: computed before settle_private.
    pub tee_winner_ready: bool,
    /// IPFS gateway URL for listing JSON (`title`, `description`, `image`).
    #[max_len(256)]
    pub metadata_uri: String,
}

#[account]
#[derive(InitSpace)]
pub struct BidCommitment {
    pub auction_id: u64,
    pub bidder: Pubkey,
    pub commitment: [u8; 32],
    pub revealed: bool,
    pub bid_amount: u64,
    pub bump: u8,
}

/// Delegated ER mirror for realtime UI (leader synced from AuctionConfig on base in reveal_bid).
#[account]
#[derive(InitSpace)]
pub struct AuctionRuntime {
    pub auction_id: u64,
    pub leader_bid: u64,
    pub leader_bidder: Pubkey,
    pub commit_count: u32,
    pub reveal_count: u32,
    pub bump: u8,
}

/// Private mode: encrypted bid payload (permissioned flow in TEE).
#[account]
#[derive(InitSpace)]
pub struct BidCiphertext {
    pub auction_id: u64,
    pub bidder: Pubkey,
    pub ciphertext: [u8; MAX_CIPHERTEXT_LEN],
    pub ciphertext_len: u16,
    pub bump: u8,
}

#[event]
pub struct AuctionInitialized {
    pub auction_id: u64,
    pub seller: Pubkey,
    pub private_mode: bool,
}

#[event]
pub struct BidCommitted {
    pub auction_id: u64,
    pub bidder: Pubkey,
}

#[event]
pub struct BidRevealed {
    pub auction_id: u64,
    pub bidder: Pubkey,
    pub bid_amount: u64,
}

#[event]
pub struct PhaseChanged {
    pub auction_id: u64,
    pub new_phase: u8,
}

#[event]
pub struct AuctionSettled {
    pub auction_id: u64,
    pub winner: Pubkey,
    pub winning_price: u64,
    pub result_hash: [u8; 32],
}

#[event]
pub struct PrivateWinnerComputed {
    pub auction_id: u64,
    pub winner: Pubkey,
    pub winning_price: u64,
    pub result_hash: [u8; 32],
}
