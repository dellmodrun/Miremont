use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub verifier_authority: Pubkey,
    pub operations_wallet: Pubkey,
    pub reserve_wallet: Pubkey,
    pub burn_denominator: u64,
    pub lease_seconds: i64,
    pub challenge_seconds: i64,
    pub epoch_seconds: i64,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    pub total_deposited: u64,
    pub total_allocated: u64,
    pub total_claimed: u64,
    pub operations_accrued: u64,
    pub reserve_accrued: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Project {
    pub id: u64,
    pub authority: Pubkey,
    pub artifact_root: [u8; 32],
    pub review_policy: [u8; 32],
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TaskContract {
    pub id: u64,
    pub project: Pubkey,
    pub publisher: Pubkey,
    pub scope_hash: [u8; 32],
    pub artifact_destination: [u8; 32],
    pub role: u8,
    pub difficulty: u8,
    pub base_points: u16,
    pub lease_seconds: i64,
    pub max_cursors: u16,
    pub cursor_count: u16,
    pub open: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CursorStatus {
    Active,
    Submitted,
    PendingChallenge,
    Challenged,
    Rejected,
    Finalized,
    Expired,
}

#[account]
#[derive(InitSpace)]
pub struct CursorAccount {
    pub owner: Pubkey,
    pub project: Pubkey,
    pub task: Pubkey,
    pub nonce: u64,
    pub role: u8,
    pub burn_amount: u64,
    pub created_at: i64,
    pub deadline: i64,
    pub submitted_at: i64,
    pub challenge_deadline: i64,
    pub finalized_at: i64,
    pub output_hash: [u8; 32],
    pub status: CursorStatus,
    pub approvals: u8,
    pub rejections: u8,
    pub review_count: u8,
    pub quality_sum: u16,
    pub points: u64,
    pub epoch_id: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ReviewRecord {
    pub cursor: Pubkey,
    pub reviewer: Pubkey,
    pub approve: bool,
    pub quality_tier: u8,
    pub evidence_hash: [u8; 32],
    pub created_at: i64,
    pub epoch_id: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ChallengeRecord {
    pub cursor: Pubkey,
    pub challenger: Pubkey,
    pub evidence_hash: [u8; 32],
    pub created_at: i64,
    pub resolved: bool,
    pub upheld: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Epoch {
    pub id: u64,
    pub starts_at: i64,
    pub ends_at: i64,
    pub total_builder_points: u64,
    pub total_review_units: u64,
    pub net_sol: u64,
    pub builder_pool: u64,
    pub reviewer_pool: u64,
    pub settled: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RewardClaim {
    pub epoch: Pubkey,
    pub claimant: Pubkey,
    pub reference: Pubkey,
    pub amount: u64,
    pub claimed_at: i64,
    pub bump: u8,
}
