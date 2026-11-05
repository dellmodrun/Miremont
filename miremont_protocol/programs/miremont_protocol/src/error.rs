use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("The signer is not authorized for this action")]
    Unauthorized,
    #[msg("The supplied token mint is not the configured Miremont mint")]
    InvalidMint,
    #[msg("The account or instruction state is invalid")]
    InvalidState,
    #[msg("The task contract is closed")]
    TaskClosed,
    #[msg("The task has reached its Cursor capacity")]
    TaskCapacityReached,
    #[msg("The burn amount cannot be zero")]
    ZeroBurn,
    #[msg("The Cursor lease has expired")]
    LeaseExpired,
    #[msg("The builder cannot review their own Cursor")]
    SelfReview,
    #[msg("Quality tier must be 0, 1, or 2")]
    InvalidQuality,
    #[msg("Three independent reviews are required")]
    ReviewQuorumMissing,
    #[msg("The challenge window is still open")]
    ChallengeWindowOpen,
    #[msg("The challenge window has closed")]
    ChallengeWindowClosed,
    #[msg("This epoch is not the current epoch")]
    InvalidEpoch,
    #[msg("The epoch has not ended")]
    EpochStillOpen,
    #[msg("The epoch has already settled")]
    EpochAlreadySettled,
    #[msg("The epoch has not settled")]
    EpochNotSettled,
    #[msg("No reward is available")]
    NothingToClaim,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Treasury balance is insufficient")]
    InsufficientTreasury,
}
