pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("HB1DSzqQFLRPAabjSoFGG7tbkNGya27enKfuAsXJND88");

#[program]
pub mod miremont_protocol {
    use super::*;

    pub fn initialize_protocol(ctx: Context<InitializeProtocol>, args: InitializeArgs) -> Result<()> {
        crate::instructions::handle_initialize_protocol(ctx, args)
    }

    pub fn register_project(ctx: Context<RegisterProject>, project_id: u64, artifact_root: [u8; 32], review_policy: [u8; 32]) -> Result<()> {
        crate::instructions::handle_register_project(ctx, project_id, artifact_root, review_policy)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn publish_task(ctx: Context<PublishTask>, task_id: u64, scope_hash: [u8; 32], artifact_destination: [u8; 32], role: u8, difficulty: u8, base_points: u16, lease_seconds: i64, max_cursors: u16) -> Result<()> {
        crate::instructions::handle_publish_task(ctx, task_id, scope_hash, artifact_destination, role, difficulty, base_points, lease_seconds, max_cursors)
    }

    pub fn burn_and_spawn(ctx: Context<BurnAndSpawn>, nonce: u64) -> Result<()> {
        crate::instructions::handle_burn_and_spawn(ctx, nonce)
    }

    pub fn submit_build(ctx: Context<SubmitBuild>, output_hash: [u8; 32]) -> Result<()> {
        crate::instructions::handle_submit_build(ctx, output_hash)
    }

    pub fn review_build(ctx: Context<ReviewBuild>, approve: bool, quality_tier: u8, evidence_hash: [u8; 32]) -> Result<()> {
        crate::instructions::handle_review_build(ctx, approve, quality_tier, evidence_hash)
    }

    pub fn challenge_build(ctx: Context<ChallengeBuild>, evidence_hash: [u8; 32]) -> Result<()> {
        crate::instructions::handle_challenge_build(ctx, evidence_hash)
    }

    pub fn resolve_challenge(ctx: Context<ResolveChallenge>, uphold: bool) -> Result<()> {
        crate::instructions::handle_resolve_challenge(ctx, uphold)
    }

    pub fn open_epoch(ctx: Context<OpenEpoch>, epoch_id: u64) -> Result<()> {
        crate::instructions::handle_open_epoch(ctx, epoch_id)
    }

    pub fn finalize_build(ctx: Context<FinalizeBuild>) -> Result<()> {
        crate::instructions::handle_finalize_build(ctx)
    }

    pub fn deposit_fees(ctx: Context<DepositFees>, amount: u64) -> Result<()> {
        crate::instructions::handle_deposit_fees(ctx, amount)
    }

    pub fn settle_epoch(ctx: Context<SettleEpoch>) -> Result<()> {
        crate::instructions::handle_settle_epoch(ctx)
    }

    pub fn claim_builder_reward(ctx: Context<ClaimBuilderReward>) -> Result<()> {
        crate::instructions::handle_claim_builder_reward(ctx)
    }

    pub fn claim_review_reward(ctx: Context<ClaimReviewReward>) -> Result<()> {
        crate::instructions::handle_claim_review_reward(ctx)
    }
}
