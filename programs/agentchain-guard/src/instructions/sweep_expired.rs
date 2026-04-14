use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::GuardError;
use crate::events::IntentExpired;
use crate::state::ActionIntent;

#[derive(Accounts)]
pub struct SweepExpired<'info> {
    #[account(
        mut,
        seeds = [INTENT_SEED, action_intent.id.as_ref()],
        bump = action_intent.bump,
        constraint = action_intent.status == status::PROPOSED
            || action_intent.status == status::PENDING_APPROVAL
            || action_intent.status == status::APPROVED_READY
            @ GuardError::ActionNotExpired,
    )]
    pub action_intent: Account<'info, ActionIntent>,

    /// Anyone can sweep expired intents
    pub signer: Signer<'info>,
}

pub fn handler(ctx: Context<SweepExpired>) -> Result<()> {
    let clock = Clock::get()?;
    let intent = &ctx.accounts.action_intent;

    // Must actually be expired
    require!(
        clock.unix_timestamp >= intent.expires_at,
        GuardError::ActionNotExpired,
    );

    // Transition to expired — funds can then be refunded
    let intent = &mut ctx.accounts.action_intent;
    intent.status = status::EXPIRED;

    emit!(IntentExpired {
        intent_id: intent.id,
        timestamp: clock.unix_timestamp,
    });

    msg!("Intent expired: {:?}", &intent.id[..8]);

    Ok(())
}
