use anchor_lang::prelude::*;

pub const DEPLOY_AUTHORITY: Pubkey = pubkey!("4yFpoakRmFgJmQxrtf5XEQ72eKW5TUq1wuu7y9Hu9YQd");

#[constant]
pub const CONFIG_SEED: &[u8] = b"config";
#[constant]
pub const TREASURY_SEED: &[u8] = b"treasury";
#[constant]
pub const PROJECT_SEED: &[u8] = b"project";
#[constant]
pub const TASK_SEED: &[u8] = b"task";
#[constant]
pub const CURSOR_SEED: &[u8] = b"cursor";
#[constant]
pub const REVIEW_SEED: &[u8] = b"review";
#[constant]
pub const CHALLENGE_SEED: &[u8] = b"challenge";
#[constant]
pub const EPOCH_SEED: &[u8] = b"epoch";
#[constant]
pub const BUILDER_CLAIM_SEED: &[u8] = b"builder_claim";
#[constant]
pub const REVIEW_CLAIM_SEED: &[u8] = b"review_claim";

pub const BURN_DENOMINATOR: u64 = 100_000;
pub const DEFAULT_LEASE_SECONDS: i64 = 72 * 60 * 60;
pub const DEFAULT_CHALLENGE_SECONDS: i64 = 24 * 60 * 60;
pub const DEFAULT_EPOCH_SECONDS: i64 = 24 * 60 * 60;
pub const BUILDER_BPS: u64 = 7_000;
pub const REVIEWER_BPS: u64 = 1_500;
pub const OPERATIONS_BPS: u64 = 1_000;
pub const RESERVE_BPS: u64 = 500;
pub const BPS_DENOMINATOR: u64 = 10_000;
pub const MAX_POINTS: u64 = 500;
