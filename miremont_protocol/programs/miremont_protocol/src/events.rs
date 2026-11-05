use anchor_lang::prelude::*;

#[event]
pub struct ProtocolInitialized { pub authority: Pubkey, pub mint: Pubkey, pub treasury: Pubkey }
#[event]
pub struct ProjectRegistered { pub project: Pubkey, pub authority: Pubkey, pub id: u64 }
#[event]
pub struct TaskPublished { pub task: Pubkey, pub project: Pubkey, pub id: u64, pub role: u8, pub difficulty: u8 }
#[event]
pub struct CursorSpawned { pub cursor: Pubkey, pub owner: Pubkey, pub task: Pubkey, pub burn_amount: u64, pub deadline: i64 }
#[event]
pub struct BuildSubmitted { pub cursor: Pubkey, pub owner: Pubkey, pub output_hash: [u8; 32] }
#[event]
pub struct BuildReviewed { pub cursor: Pubkey, pub reviewer: Pubkey, pub approve: bool, pub quality_tier: u8, pub review_count: u8 }
#[event]
pub struct BuildChallenged { pub cursor: Pubkey, pub challenger: Pubkey }
#[event]
pub struct ChallengeResolved { pub cursor: Pubkey, pub upheld: bool }
#[event]
pub struct EpochOpened { pub epoch: Pubkey, pub id: u64, pub ends_at: i64 }
#[event]
pub struct BuildFinalized { pub cursor: Pubkey, pub owner: Pubkey, pub points: u64, pub epoch_id: u64 }
#[event]
pub struct FeesDeposited { pub depositor: Pubkey, pub amount: u64 }
#[event]
pub struct EpochSettled { pub epoch: Pubkey, pub id: u64, pub net_sol: u64, pub builder_pool: u64, pub reviewer_pool: u64 }
#[event]
pub struct RewardClaimed { pub claimant: Pubkey, pub reference: Pubkey, pub amount: u64, pub kind: u8 }
