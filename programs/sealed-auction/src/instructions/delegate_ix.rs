use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};

use crate::state::RUNTIME_SEED;
use crate::{CommitRuntime, DelegateRuntime, UndelegateRuntime};

pub fn delegate_runtime_handler(
    ctx: Context<DelegateRuntime>,
    auction_id: u64,
) -> Result<()> {
    ctx.accounts.delegate_runtime(
        &ctx.accounts.payer,
        &[RUNTIME_SEED, &auction_id.to_le_bytes()],
        DelegateConfig {
            validator: ctx.remaining_accounts.first().map(|a| a.key()),
            ..Default::default()
        },
    )?;
    Ok(())
}

pub fn commit_runtime_handler(ctx: Context<CommitRuntime>, _auction_id: u64) -> Result<()> {
    commit_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.runtime.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    Ok(())
}

pub fn undelegate_runtime_handler(ctx: Context<UndelegateRuntime>, _auction_id: u64) -> Result<()> {
    commit_and_undelegate_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.runtime.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    Ok(())
}
