use anchor_lang::prelude::*;

use crate::{constants::*, error::ErrorCode, events::*, state::*};

#[derive(Accounts)]
#[instruction(epoch_id: u64)]
pub struct OpenEpoch<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(init, payer = payer, space = 8 + Epoch::INIT_SPACE, seeds = [EPOCH_SEED, &epoch_id.to_le_bytes()], bump)]
    pub epoch: Account<'info, Epoch>,
    pub system_program: Program<'info, System>,
}

pub fn handle_open_epoch(ctx: Context<OpenEpoch>, epoch_id: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let expected = u64::try_from(now.checked_div(ctx.accounts.config.epoch_seconds).ok_or(ErrorCode::ArithmeticOverflow)?)
        .map_err(|_| ErrorCode::InvalidEpoch)?;
    require!(epoch_id == expected, ErrorCode::InvalidEpoch);
    let starts_at = i64::try_from(epoch_id).map_err(|_| ErrorCode::ArithmeticOverflow)?
        .checked_mul(ctx.accounts.config.epoch_seconds).ok_or(ErrorCode::ArithmeticOverflow)?;
    let epoch = &mut ctx.accounts.epoch;
    epoch.id = epoch_id;
    epoch.starts_at = starts_at;
    epoch.ends_at = starts_at.checked_add(ctx.accounts.config.epoch_seconds).ok_or(ErrorCode::ArithmeticOverflow)?;
    epoch.total_builder_points = 0;
    epoch.total_review_units = 0;
    epoch.net_sol = 0;
    epoch.builder_pool = 0;
    epoch.reviewer_pool = 0;
    epoch.settled = false;
    epoch.bump = ctx.bumps.epoch;
    emit!(EpochOpened { epoch: epoch.key(), id: epoch.id, ends_at: epoch.ends_at });
    Ok(())
}

#[derive(Accounts)]
pub struct DepositFees<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut, seeds = [TREASURY_SEED], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    pub system_program: Program<'info, System>,
}

pub fn handle_deposit_fees(ctx: Context<DepositFees>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidState);
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.depositor.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
    };
    anchor_lang::system_program::transfer(CpiContext::new(ctx.accounts.system_program.key(), cpi_accounts), amount)?;
    ctx.accounts.treasury.total_deposited = ctx.accounts.treasury.total_deposited.checked_add(amount).ok_or(ErrorCode::ArithmeticOverflow)?;
    emit!(FeesDeposited { depositor: ctx.accounts.depositor.key(), amount });
    Ok(())
}

#[derive(Accounts)]
pub struct SettleEpoch<'info> {
    #[account(mut, seeds = [TREASURY_SEED], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    #[account(mut, seeds = [EPOCH_SEED, &epoch.id.to_le_bytes()], bump = epoch.bump)]
    pub epoch: Account<'info, Epoch>,
}

pub fn handle_settle_epoch(ctx: Context<SettleEpoch>) -> Result<()> {
    require!(Clock::get()?.unix_timestamp >= ctx.accounts.epoch.ends_at, ErrorCode::EpochStillOpen);
    require!(!ctx.accounts.epoch.settled, ErrorCode::EpochAlreadySettled);
    let available = ctx.accounts.treasury.total_deposited.checked_sub(ctx.accounts.treasury.total_allocated).ok_or(ErrorCode::ArithmeticOverflow)?;
    let builder_pool = if ctx.accounts.epoch.total_builder_points > 0 {
        available.checked_mul(BUILDER_BPS).ok_or(ErrorCode::ArithmeticOverflow)? / BPS_DENOMINATOR
    } else {
        0
    };
    let reviewer_pool = if ctx.accounts.epoch.total_review_units > 0 {
        available.checked_mul(REVIEWER_BPS).ok_or(ErrorCode::ArithmeticOverflow)? / BPS_DENOMINATOR
    } else {
        0
    };
    let operations = available.checked_mul(OPERATIONS_BPS).ok_or(ErrorCode::ArithmeticOverflow)? / BPS_DENOMINATOR;
    let reserve = available.checked_mul(RESERVE_BPS).ok_or(ErrorCode::ArithmeticOverflow)? / BPS_DENOMINATOR;
    let allocated = builder_pool
        .checked_add(reviewer_pool).and_then(|v| v.checked_add(operations)).and_then(|v| v.checked_add(reserve))
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    let epoch = &mut ctx.accounts.epoch;
    epoch.net_sol = available;
    epoch.builder_pool = builder_pool;
    epoch.reviewer_pool = reviewer_pool;
    epoch.settled = true;
    let treasury = &mut ctx.accounts.treasury;
    treasury.total_allocated = treasury.total_allocated.checked_add(allocated).ok_or(ErrorCode::ArithmeticOverflow)?;
    treasury.operations_accrued = treasury.operations_accrued.checked_add(operations).ok_or(ErrorCode::ArithmeticOverflow)?;
    treasury.reserve_accrued = treasury.reserve_accrued.checked_add(reserve).ok_or(ErrorCode::ArithmeticOverflow)?;
    emit!(EpochSettled { epoch: epoch.key(), id: epoch.id, net_sol: available, builder_pool, reviewer_pool });
    Ok(())
}

fn transfer_from_treasury<'info>(treasury: &Account<'info, Treasury>, recipient: &AccountInfo<'info>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::NothingToClaim);
    let treasury_info = treasury.to_account_info();
    let treasury_balance = treasury_info.lamports();
    require!(treasury_balance >= amount, ErrorCode::InsufficientTreasury);
    **treasury_info.try_borrow_mut_lamports()? = treasury_balance.checked_sub(amount).ok_or(ErrorCode::ArithmeticOverflow)?;
    let recipient_balance = recipient.lamports();
    **recipient.try_borrow_mut_lamports()? = recipient_balance.checked_add(amount).ok_or(ErrorCode::ArithmeticOverflow)?;
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimBuilderReward<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [TREASURY_SEED], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    #[account(seeds = [EPOCH_SEED, &epoch.id.to_le_bytes()], bump = epoch.bump)]
    pub epoch: Account<'info, Epoch>,
    #[account(has_one = owner @ ErrorCode::Unauthorized)]
    pub cursor: Account<'info, CursorAccount>,
    #[account(init, payer = owner, space = 8 + RewardClaim::INIT_SPACE, seeds = [BUILDER_CLAIM_SEED, epoch.key().as_ref(), cursor.key().as_ref()], bump)]
    pub claim: Account<'info, RewardClaim>,
    pub system_program: Program<'info, System>,
}

pub fn handle_claim_builder_reward(ctx: Context<ClaimBuilderReward>) -> Result<()> {
    require!(ctx.accounts.epoch.settled, ErrorCode::EpochNotSettled);
    require!(ctx.accounts.cursor.status == CursorStatus::Finalized, ErrorCode::InvalidState);
    require!(ctx.accounts.cursor.epoch_id == ctx.accounts.epoch.id, ErrorCode::InvalidEpoch);
    let amount = ctx.accounts.epoch.builder_pool
        .checked_mul(ctx.accounts.cursor.points).ok_or(ErrorCode::ArithmeticOverflow)?
        .checked_div(ctx.accounts.epoch.total_builder_points).ok_or(ErrorCode::NothingToClaim)?;
    transfer_from_treasury(&ctx.accounts.treasury, &ctx.accounts.owner.to_account_info(), amount)?;
    ctx.accounts.treasury.total_claimed = ctx.accounts.treasury.total_claimed.checked_add(amount).ok_or(ErrorCode::ArithmeticOverflow)?;
    let claim = &mut ctx.accounts.claim;
    claim.epoch = ctx.accounts.epoch.key();
    claim.claimant = ctx.accounts.owner.key();
    claim.reference = ctx.accounts.cursor.key();
    claim.amount = amount;
    claim.claimed_at = Clock::get()?.unix_timestamp;
    claim.bump = ctx.bumps.claim;
    emit!(RewardClaimed { claimant: claim.claimant, reference: claim.reference, amount, kind: 0 });
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimReviewReward<'info> {
    #[account(mut)]
    pub reviewer: Signer<'info>,
    #[account(mut, seeds = [TREASURY_SEED], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    #[account(seeds = [EPOCH_SEED, &epoch.id.to_le_bytes()], bump = epoch.bump)]
    pub epoch: Account<'info, Epoch>,
    pub cursor: Account<'info, CursorAccount>,
    #[account(has_one = reviewer @ ErrorCode::Unauthorized, constraint = review.cursor == cursor.key() @ ErrorCode::InvalidState)]
    pub review: Account<'info, ReviewRecord>,
    #[account(init, payer = reviewer, space = 8 + RewardClaim::INIT_SPACE, seeds = [REVIEW_CLAIM_SEED, epoch.key().as_ref(), review.key().as_ref()], bump)]
    pub claim: Account<'info, RewardClaim>,
    pub system_program: Program<'info, System>,
}

pub fn handle_claim_review_reward(ctx: Context<ClaimReviewReward>) -> Result<()> {
    require!(ctx.accounts.epoch.settled, ErrorCode::EpochNotSettled);
    require!(ctx.accounts.cursor.epoch_id == ctx.accounts.epoch.id, ErrorCode::InvalidEpoch);
    let amount = ctx.accounts.epoch.reviewer_pool.checked_div(ctx.accounts.epoch.total_review_units).ok_or(ErrorCode::NothingToClaim)?;
    transfer_from_treasury(&ctx.accounts.treasury, &ctx.accounts.reviewer.to_account_info(), amount)?;
    ctx.accounts.treasury.total_claimed = ctx.accounts.treasury.total_claimed.checked_add(amount).ok_or(ErrorCode::ArithmeticOverflow)?;
    let claim = &mut ctx.accounts.claim;
    claim.epoch = ctx.accounts.epoch.key();
    claim.claimant = ctx.accounts.reviewer.key();
    claim.reference = ctx.accounts.review.key();
    claim.amount = amount;
    claim.claimed_at = Clock::get()?.unix_timestamp;
    claim.bump = ctx.bumps.claim;
    emit!(RewardClaimed { claimant: claim.claimant, reference: claim.reference, amount, kind: 1 });
    Ok(())
}
