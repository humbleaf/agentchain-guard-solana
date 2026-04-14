use anchor_lang::prelude::*;
use crate::constants::GUARD_CONFIG_SEED;
use crate::state::GuardConfig;

#[derive(Accounts)]
pub struct InitializeGuard<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GuardConfig::INIT_SPACE,
        seeds = [GUARD_CONFIG_SEED],
        bump,
    )]
    pub guard_config: Account<'info, GuardConfig>,

    /// The mint used for all settlements (e.g. mock USDC)
    pub treasury_mint: Account<'info, anchor_spl::token::Mint>,

    /// Admin who initializes and controls the guard
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeGuard>, default_daily_cap: u64) -> Result<()> {
    let config = &mut ctx.accounts.guard_config;

    config.authority = ctx.accounts.authority.key();
    config.treasury_mint = ctx.accounts.treasury_mint.key();
    config.receipt_signer = ctx.accounts.authority.key(); // Default: authority signs receipts
    config.approval_signer = ctx.accounts.authority.key(); // Default: authority approves
    config.default_daily_cap = default_daily_cap;
    config.total_value_guarded = 0;
    config.total_actions = 0;
    config.total_denied = 0;
    config.paused = false;
    config.bump = ctx.bumps.guard_config;

    msg!("Guard initialized. Mint: {}", config.treasury_mint);

    Ok(())
}
