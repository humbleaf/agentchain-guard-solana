use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::GuardError;
use crate::events::IntentRefunded;
use crate::state::{GuardConfig, ActionIntent};

#[derive(Accounts)]
pub struct RefundAction<'info> {
    #[account(
        seeds = [GUARD_CONFIG_SEED],
        bump = guard_config.bump,
    )]
    pub guard_config: Account<'info, GuardConfig>,

    #[account(
        mut,
        seeds = [INTENT_SEED, action_intent.id.as_ref()],
        bump = action_intent.bump,
        constraint = action_intent.status == status::DENIED || action_intent.status == status::EXPIRED
            @ GuardError::ActionNotRefundable,
    )]
    pub action_intent: Account<'info, ActionIntent>,

    /// PDA-owned vault — source of refund
    #[account(
        mut,
        seeds = [VAULT_SEED, guard_config.treasury_mint.as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Requester's token account — destination of refund
    #[account(
        mut,
        constraint = requester_token_account.mint == guard_config.treasury_mint,
        constraint = requester_token_account.owner == action_intent.requester,
    )]
    pub requester_token_account: Account<'info, TokenAccount>,

    /// Anyone can trigger a refund for denied/expired intents
    pub signer: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<RefundAction>) -> Result<()> {
    let intent = &ctx.accounts.action_intent;
    let clock = Clock::get()?;

    // ── Transfer from vault back to requester ──
    let mint_key = ctx.accounts.guard_config.treasury_mint;
    let vault_bump = ctx.bumps.vault_token_account;
    let signer_seeds: &[&[&[u8]]] = &[&[
        VAULT_SEED,
        mint_key.as_ref(),
        &[vault_bump],
    ]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.requester_token_account.to_account_info(),
            authority: ctx.accounts.vault_token_account.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, intent.amount)?;

    // ── Update state ──
    let intent = &mut ctx.accounts.action_intent;
    intent.status = status::REFUNDED;

    emit!(IntentRefunded {
        intent_id: intent.id,
        requester: intent.requester,
        amount: intent.amount,
        timestamp: clock.unix_timestamp,
    });

    msg!("Intent refunded: {:?}, amount: {}", &intent.id[..8], intent.amount);

    Ok(())
}
