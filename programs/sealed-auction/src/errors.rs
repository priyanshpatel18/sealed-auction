use anchor_lang::prelude::*;

#[error_code]
pub enum SealedAuctionError {
    #[msg("Auction not initialized")]
    AuctionNotInitialized,
    #[msg("Wrong auction phase")]
    AuctionPhaseMismatch,
    #[msg("Commit window closed")]
    CommitWindowClosed,
    #[msg("Reveal window closed")]
    RevealWindowClosed,
    #[msg("Commitment does not match reveal")]
    CommitmentMismatch,
    #[msg("Bid already committed")]
    BidAlreadyCommitted,
    #[msg("Bid already revealed")]
    BidAlreadyRevealed,
    #[msg("Reveal not allowed yet")]
    RevealNotAllowed,
    #[msg("Insufficient funds for deposit")]
    InsufficientFundsForDeposit,
    #[msg("Settlement too early")]
    SettlementTooEarly,
    #[msg("Auction already settled")]
    AlreadySettled,
    #[msg("Bid amount out of range")]
    BidOutOfRange,
    #[msg("No revealed bids to settle")]
    NoRevealedBids,
    #[msg("Salt too long")]
    SaltTooLong,
    #[msg("Invalid token mint")]
    InvalidMint,
    #[msg("Private mode mismatch")]
    PrivateModeMismatch,
    #[msg("Encrypted ciphertext too long")]
    CiphertextTooLong,
    #[msg("Winner not computed yet")]
    WinnerNotComputed,
    #[msg("Ciphertext aggregate digest does not match on-chain bids")]
    AggregateMismatch,
}
