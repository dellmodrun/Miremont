use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Burn, Mint, TokenAccount, TokenInterface};

use crate::{constants::*, error::ErrorCode, events::*, state::*};

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct BurnAndSpawn<'info> {
    #[account(mut)]
    pub builder: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut, address = config.mint @ ErrorCode::InvalidMint)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = builder)]
    pub builder_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub task: Account<'info, TaskContract>,
    #[account(init, payer = builder, space = 8 + CursorAccount::INIT_SPACE, seeds = [CURSOR_SEED, task.key().as_ref(), builder.key().as_ref(), &nonce.to_le_bytes()], bump)]
    pub cursor: Account<'info, CursorAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_burn_and_spawn(ctx: Context<BurnAndSpawn>, nonce: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, ErrorCode::InvalidState);
    require!(ctx.accounts.task.open, ErrorCode::TaskClosed);
    require!(ctx.accounts.task.cursor_count < ctx.accounts.task.max_cursors, ErrorCode::TaskCapacityReached);
    let denominator = ctx.accounts.config.burn_denominator;
    let burn_amount = ctx.accounts.mint.supply
        .checked_add(denominator.checked_sub(1).ok_or(ErrorCode::ArithmeticOverflow)?)
        .ok_or(ErrorCode::ArithmeticOverflow)?
        .checked_div(denominator)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    require!(burn_amount > 0, ErrorCode::ZeroBurn);
    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.builder_token_account.to_account_info(),
        authority: ctx.accounts.builder.to_account_info(),
    };
    token_interface::burn(CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts), burn_amount)?;
    let now = Clock::get()?.unix_timestamp;
    let cursor = &mut ctx.accounts.cursor;
    cursor.owner = ctx.accounts.builder.key();
    cursor.project = ctx.accounts.task.project;
    cursor.task = ctx.accounts.task.key();
    cursor.nonce = nonce;
    cursor.role = ctx.accounts.task.role;
    cursor.burn_amount = burn_amount;
    cursor.created_at = now;
    cursor.deadline = now.checked_add(ctx.accounts.task.lease_seconds).ok_or(ErrorCode::ArithmeticOverflow)?;
    cursor.submitted_at = 0;
    cursor.challenge_deadline = 0;
    cursor.finalized_at = 0;
    cursor.output_hash = [0; 32];
    cursor.status = CursorStatus::Active;
    cursor.approvals = 0;
    cursor.rejections = 0;
    cursor.review_count = 0;
    cursor.quality_sum = 0;
    cursor.points = 0;
    cursor.epoch_id = 0;
    cursor.bump = ctx.bumps.cursor;
    ctx.accounts.task.cursor_count = ctx.accounts.task.cursor_count.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
    emit!(CursorSpawned { cursor: cursor.key(), owner: cursor.owner, task: cursor.task, burn_amount, deadline: cursor.deadline });
    Ok(())
}

#[derive(Accounts)]
pub struct SubmitBuild<'info> {
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner @ ErrorCode::Unauthorized)]
    pub cursor: Account<'info, CursorAccount>,
}

pub fn handle_submit_build(ctx: Context<SubmitBuild>, output_hash: [u8; 32]) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(ctx.accounts.cursor.status == CursorStatus::Active, ErrorCode::InvalidState);
    require!(now <= ctx.accounts.cursor.deadline, ErrorCode::LeaseExpired);
    require!(output_hash != [0; 32], ErrorCode::InvalidState);
    let cursor = &mut ctx.accounts.cursor;
    cursor.output_hash = output_hash;
    cursor.submitted_at = now;
    cursor.status = CursorStatus::Submitted;
    emit!(BuildSubmitted { cursor: cursor.key(), owner: cursor.owner, output_hash });
    Ok(())
}

#[derive(Accounts)]
pub struct ReviewBuild<'info> {
    #[account(mut)]
    pub reviewer: Signer<'info>,
    #[account(mut)]
    pub cursor: Account<'info, CursorAccount>,
    #[account(init, payer = reviewer, space = 8 + ReviewRecord::INIT_SPACE, seeds = [REVIEW_SEED, cursor.key().as_ref(), reviewer.key().as_ref()], bump)]
    pub review: Account<'info, ReviewRecord>,
    pub system_program: Program<'info, System>,
}

pub fn handle_review_build(ctx: Context<ReviewBuild>, approve: bool, quality_tier: u8, evidence_hash: [u8; 32]) -> Result<()> {
    require!(ctx.accounts.cursor.status == CursorStatus::Submitted, ErrorCode::InvalidState);
    require_keys_neq!(ctx.accounts.reviewer.key(), ctx.accounts.cursor.owner, ErrorCode::SelfReview);
    require!(quality_tier <= 2, ErrorCode::InvalidQuality);
    let now = Clock::get()?.unix_timestamp;
    let review = &mut ctx.accounts.review;
    review.cursor = ctx.accounts.cursor.key();
    review.reviewer = ctx.accounts.reviewer.key();
    review.approve = approve;
    review.quality_tier = quality_tier;
    review.evidence_hash = evidence_hash;
    review.created_at = now;
    review.epoch_id = 0;
    review.bump = ctx.bumps.review;
    let cursor = &mut ctx.accounts.cursor;
    cursor.review_count = cursor.review_count.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
    if approve {
        cursor.approvals = cursor.approvals.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
        cursor.quality_sum = cursor.quality_sum.checked_add(u16::from(quality_tier)).ok_or(ErrorCode::ArithmeticOverflow)?;
    } else {
        cursor.rejections = cursor.rejections.checked_add(1).ok_or(ErrorCode::ArithmeticOverflow)?;
    }
    if cursor.review_count == 3 {
        if cursor.approvals >= 2 {
            cursor.status = CursorStatus::PendingChallenge;
            cursor.challenge_deadline = now.checked_add(DEFAULT_CHALLENGE_SECONDS).ok_or(ErrorCode::ArithmeticOverflow)?;
        } else {
            cursor.status = CursorStatus::Rejected;
            cursor.finalized_at = now;
        }
    }
    emit!(BuildReviewed { cursor: cursor.key(), reviewer: review.reviewer, approve, quality_tier, review_count: cursor.review_count });
    Ok(())
}

#[derive(Accounts)]
pub struct ChallengeBuild<'info> {
    #[account(mut)]
    pub challenger: Signer<'info>,
    #[account(mut)]
    pub cursor: Account<'info, CursorAccount>,
    #[account(init, payer = challenger, space = 8 + ChallengeRecord::INIT_SPACE, seeds = [CHALLENGE_SEED, cursor.key().as_ref()], bump)]
    pub challenge: Account<'info, ChallengeRecord>,
    pub system_program: Program<'info, System>,
}

pub fn handle_challenge_build(ctx: Context<ChallengeBuild>, evidence_hash: [u8; 32]) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(ctx.accounts.cursor.status == CursorStatus::PendingChallenge, ErrorCode::InvalidState);
    require!(now < ctx.accounts.cursor.challenge_deadline, ErrorCode::ChallengeWindowClosed);
    require!(evidence_hash != [0; 32], ErrorCode::InvalidState);
    let challenge = &mut ctx.accounts.challenge;
    challenge.cursor = ctx.accounts.cursor.key();
    challenge.challenger = ctx.accounts.challenger.key();
    challenge.evidence_hash = evidence_hash;
    challenge.created_at = now;
    challenge.resolved = false;
    challenge.upheld = false;
    challenge.bump = ctx.bumps.challenge;
    ctx.accounts.cursor.status = CursorStatus::Challenged;
    emit!(BuildChallenged { cursor: ctx.accounts.cursor.key(), challenger: challenge.challenger });
    Ok(())
}

#[derive(Accounts)]
pub struct ResolveChallenge<'info> {
    pub verifier: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub cursor: Account<'info, CursorAccount>,
    #[account(mut, seeds = [CHALLENGE_SEED, cursor.key().as_ref()], bump = challenge.bump)]
    pub challenge: Account<'info, ChallengeRecord>,
}

pub fn handle_resolve_challenge(ctx: Context<ResolveChallenge>, uphold: bool) -> Result<()> {
    require_keys_eq!(ctx.accounts.verifier.key(), ctx.accounts.config.verifier_authority, ErrorCode::Unauthorized);
    require!(ctx.accounts.cursor.status == CursorStatus::Challenged, ErrorCode::InvalidState);
    require!(!ctx.accounts.challenge.resolved, ErrorCode::InvalidState);
    ctx.accounts.challenge.resolved = true;
    ctx.accounts.challenge.upheld = uphold;
    if uphold {
        ctx.accounts.cursor.status = CursorStatus::Rejected;
        ctx.accounts.cursor.finalized_at = Clock::get()?.unix_timestamp;
    } else {
        ctx.accounts.cursor.status = CursorStatus::PendingChallenge;
        ctx.accounts.cursor.challenge_deadline = Clock::get()?.unix_timestamp;
    }
    emit!(ChallengeResolved { cursor: ctx.accounts.cursor.key(), upheld: uphold });
    Ok(())
}

#[derive(Accounts)]
pub struct FinalizeBuild<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    pub task: Account<'info, TaskContract>,
    #[account(mut, has_one = task)]
    pub cursor: Account<'info, CursorAccount>,
    #[account(mut, seeds = [EPOCH_SEED, &epoch.id.to_le_bytes()], bump = epoch.bump)]
    pub epoch: Account<'info, Epoch>,
}

pub fn handle_finalize_build(ctx: Context<FinalizeBuild>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(ctx.accounts.cursor.status == CursorStatus::PendingChallenge, ErrorCode::InvalidState);
    require!(ctx.accounts.cursor.review_count == 3 && ctx.accounts.cursor.approvals >= 2, ErrorCode::ReviewQuorumMissing);
    require!(now >= ctx.accounts.cursor.challenge_deadline, ErrorCode::ChallengeWindowOpen);
    let expected_epoch = u64::try_from(now.checked_div(ctx.accounts.config.epoch_seconds).ok_or(ErrorCode::ArithmeticOverflow)?).map_err(|_| ErrorCode::InvalidEpoch)?;
    require!(ctx.accounts.epoch.id == expected_epoch, ErrorCode::InvalidEpoch);
    let approved = u64::from(ctx.accounts.cursor.approvals);
    let average_quality = u64::from(ctx.accounts.cursor.quality_sum).checked_div(approved).ok_or(ErrorCode::ArithmeticOverflow)?;
    let quality_bps: u64 = match average_quality { 0 => 7_500, 1 => 10_000, _ => 12_500 };
    let points = u64::from(ctx.accounts.task.base_points)
        .checked_mul(u64::from(ctx.accounts.task.difficulty)).ok_or(ErrorCode::ArithmeticOverflow)?
        .checked_mul(quality_bps).ok_or(ErrorCode::ArithmeticOverflow)?
        .checked_div(BPS_DENOMINATOR).ok_or(ErrorCode::ArithmeticOverflow)?
        .min(MAX_POINTS);
    require!(points > 0, ErrorCode::InvalidState);
    let cursor = &mut ctx.accounts.cursor;
    cursor.points = points;
    cursor.epoch_id = ctx.accounts.epoch.id;
    cursor.finalized_at = now;
    cursor.status = CursorStatus::Finalized;
    ctx.accounts.epoch.total_builder_points = ctx.accounts.epoch.total_builder_points.checked_add(points).ok_or(ErrorCode::ArithmeticOverflow)?;
    ctx.accounts.epoch.total_review_units = ctx.accounts.epoch.total_review_units.checked_add(u64::from(cursor.review_count)).ok_or(ErrorCode::ArithmeticOverflow)?;
    emit!(BuildFinalized { cursor: cursor.key(), owner: cursor.owner, points, epoch_id: cursor.epoch_id });
    Ok(())
}
