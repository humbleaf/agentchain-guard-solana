use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::GuardError;
use crate::events::IntentSettled;
use crate::state::{GuardConfig, ActionIntent};

#[derive(Accounts)]
pub struct SettleAction<'info> {
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
    )]
    pub action_intent: Account<'info, ActionIntent>,

    /// PDA-owned vault — source of settlement funds
    #[account(
        mut,
        seeds = [VAULT_SEED, guard_config.treasury_mint.as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Recipient's token account — destination of settlement
    #[account(
        mut,
        constraint = recipient_token_account.mint == guard_config.treasury_mint,
        constraint = recipient_token_account.owner == action_intent.recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// Must be the guard authority to trigger settlement
    #[account(
        constraint = authority.key() == guard_config.authority @ GuardError::Unauthorized,
    )]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<SettleAction>) -> Result<()> {
    let intent = &ctx.accounts.action_intent;

    // ── Validate settleable state ──
    // PROPOSED (auto-pass) or APPROVED_READY (after manual approval)
    require!(
        intent.status == status::PROPOSED || intent.status == status::APPROVED_READY,
        GuardError::ActionNotSettleable,
    );

    // ── Check expiry ──
    let clock = Clock::get()?;
    require!(clock.unix_timestamp < intent.expires_at, GuardError::ActionExpired);

    // ── Transfer from vault to recipient ──
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
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.vault_token_account.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, intent.amount)?;

    // ── Update intent state ──
    let intent = &mut ctx.accounts.action_intent;
    intent.status = status::SETTLED;
    intent.settled_at = clock.unix_timestamp;

    // ── Update guard metrics ──
    let config = &mut ctx.accounts.guard_config;
    config.total_value_guarded = config
        .total_value_guarded
        .checked_add(intent.amount)
        .unwrap();

    emit!(IntentSettled {
        intent_id: intent.id,
        recipient: intent.recipient,
        amount: intent.amount,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Intent settled: {:?}, amount: {}, to: {}",
        &intent.id[..8],
        intent.amount,
        intent.recipient,
    );

    Ok(())
}
