use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::GuardError;
use crate::events::IntentDenied;
use crate::state::{GuardConfig, ActionIntent};

#[derive(Accounts)]
pub struct DenyAction<'info> {
    #[account(
        mut,
        seeds = [GUARD_CONFIG_SEED],
        bump = guard_config.bump,
    )]
    pub guard_config: Account<'info, GuardConfig>,

    #[account(
        mut,
        seeds = [INTENT_SEED, action_intent.id.as_ref()],
        bump = action_intent.bump,
        constraint = action_intent.status == status::PENDING_APPROVAL || action_intent.status == status::PROPOSED
            @ GuardError::InvalidApprovalState,
    )]
    pub action_intent: Account<'info, ActionIntent>,

    /// Must be the guard authority or approval_signer
    #[account(
        constraint = authority.key() == guard_config.authority
            || authority.key() == guard_config.approval_signer
            @ GuardError::Unauthorized,
    )]
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<DenyAction>) -> Result<()> {
    let clock = Clock::get()?;
    let intent = &mut ctx.accounts.action_intent;
    intent.status = status::DENIED;

    // Update metrics
    ctx.accounts.guard_config.total_denied += 1;

    emit!(IntentDenied {
        intent_id: intent.id,
        timestamp: clock.unix_timestamp,
    });

    msg!("Intent denied: {:?}", &intent.id[..8]);

    Ok(())
}
