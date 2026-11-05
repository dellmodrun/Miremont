use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::{constants::*, error::ErrorCode, events::*, state::*};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeArgs {
    pub verifier_authority: Pubkey,
    pub operations_wallet: Pubkey,
    pub reserve_wallet: Pubkey,
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(init, payer = authority, space = 8 + ProtocolConfig::INIT_SPACE, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(init, payer = authority, space = 8 + Treasury::INIT_SPACE, seeds = [TREASURY_SEED], bump)]
    pub treasury: Account<'info, Treasury>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_protocol(ctx: Context<InitializeProtocol>, args: InitializeArgs) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.mint = ctx.accounts.mint.key();
    config.verifier_authority = args.verifier_authority;
    config.operations_wallet = args.operations_wallet;
    config.reserve_wallet = args.reserve_wallet;
    config.burn_denominator = BURN_DENOMINATOR;
    config.lease_seconds = DEFAULT_LEASE_SECONDS;
    config.challenge_seconds = DEFAULT_CHALLENGE_SECONDS;
    config.epoch_seconds = DEFAULT_EPOCH_SECONDS;
    config.paused = false;
    config.bump = ctx.bumps.config;
    let treasury = &mut ctx.accounts.treasury;
    treasury.total_deposited = 0;
    treasury.total_allocated = 0;
    treasury.total_claimed = 0;
    treasury.operations_accrued = 0;
    treasury.reserve_accrued = 0;
    treasury.bump = ctx.bumps.treasury;
    emit!(ProtocolInitialized { authority: config.authority, mint: config.mint, treasury: treasury.key() });
    Ok(())
}

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct RegisterProject<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(init, payer = authority, space = 8 + Project::INIT_SPACE, seeds = [PROJECT_SEED, authority.key().as_ref(), &project_id.to_le_bytes()], bump)]
    pub project: Account<'info, Project>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_project(ctx: Context<RegisterProject>, project_id: u64, artifact_root: [u8; 32], review_policy: [u8; 32]) -> Result<()> {
    require!(!ctx.accounts.config.paused, ErrorCode::InvalidState);
    let project = &mut ctx.accounts.project;
    project.id = project_id;
    project.authority = ctx.accounts.authority.key();
    project.artifact_root = artifact_root;
    project.review_policy = review_policy;
    project.active = true;
    project.bump = ctx.bumps.project;
    emit!(ProjectRegistered { project: project.key(), authority: project.authority, id: project.id });
    Ok(())
}

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct PublishTask<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,
    #[account(mut, constraint = project.authority == publisher.key() @ ErrorCode::Unauthorized)]
    pub project: Account<'info, Project>,
    #[account(init, payer = publisher, space = 8 + TaskContract::INIT_SPACE, seeds = [TASK_SEED, project.key().as_ref(), &task_id.to_le_bytes()], bump)]
    pub task: Account<'info, TaskContract>,
    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn handle_publish_task(
    ctx: Context<PublishTask>,
    task_id: u64,
    scope_hash: [u8; 32],
    artifact_destination: [u8; 32],
    role: u8,
    difficulty: u8,
    base_points: u16,
    lease_seconds: i64,
    max_cursors: u16,
) -> Result<()> {
    require!(ctx.accounts.project.active, ErrorCode::InvalidState);
    require!((1..=3).contains(&difficulty), ErrorCode::InvalidState);
    require!(base_points > 0 && max_cursors > 0, ErrorCode::InvalidState);
    let task = &mut ctx.accounts.task;
    task.id = task_id;
    task.project = ctx.accounts.project.key();
    task.publisher = ctx.accounts.publisher.key();
    task.scope_hash = scope_hash;
    task.artifact_destination = artifact_destination;
    task.role = role;
    task.difficulty = difficulty;
    task.base_points = base_points;
    task.lease_seconds = if lease_seconds > 0 { lease_seconds } else { DEFAULT_LEASE_SECONDS };
    task.max_cursors = max_cursors;
    task.cursor_count = 0;
    task.open = true;
    task.bump = ctx.bumps.task;
    emit!(TaskPublished { task: task.key(), project: task.project, id: task.id, role: task.role, difficulty: task.difficulty });
    Ok(())
}
