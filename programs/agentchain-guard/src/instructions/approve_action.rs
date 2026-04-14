use anchor_lang::prelude::*;
use crate::constants::*;
use crate::error::GuardError;
use crate::events::IntentApproved;
use crate::state::{GuardConfig, ActionIntent, ApprovalRecord};

#[derive(Accounts)]
pub struct ApproveAction<'info> {
    #[account(
        seeds = [GUARD_CONFIG_SEED],
        bump = guard_config.bump,
    )]
    pub guard_config: Account<'info, GuardConfig>,

    #[account(
        mut,
        seeds = [INTENT_SEED, action_intent.id.as_ref()],
        bump = action_intent.bump,
        constraint = action_intent.status == status::PENDING_APPROVAL @ GuardError::InvalidApprovalState,
    )]
    pub action_intent: Account<'info, ActionIntent>,

    #[account(
        init,
        payer = approver,
        space = 8 + ApprovalRecord::INIT_SPACE,
        seeds = [APPROVAL_SEED, action_intent.id.as_ref()],
        bump,
    )]
    pub approval_record: Account<'info, ApprovalRecord>,

    /// Must be the designated approval_signer
    #[account(
        mut,
        constraint = approver.key() == guard_config.approval_signer @ GuardError::UnauthorizedApprover,
    )]
    pub approver: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ApproveAction>) -> Result<()> {
    let clock = Clock::get()?;

    // Capture key before mutable borrow
    let intent_key = ctx.accounts.action_intent.key();
    let intent_id = ctx.accounts.action_intent.id;

    let intent = &mut ctx.accounts.action_intent;

    // Check expiry
    require!(clock.unix_timestamp < intent.expires_at, GuardError::ActionExpired);

    // Update intent status
    intent.status = status::APPROVED_READY;

    // Write approval record
    let record = &mut ctx.accounts.approval_record;
    record.intent = intent_key;
    record.intent_id = intent_id;
    record.approver = ctx.accounts.approver.key();
    record.approved_at = clock.unix_timestamp;
    record.bump = ctx.bumps.approval_record;

    emit!(IntentApproved {
        intent_id,
        approver: ctx.accounts.approver.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Intent approved: {:?}", &intent_id[..8]);


    Ok(())
}
