use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::constants::{GUARD_CONFIG_SEED, VAULT_SEED};
use crate::state::GuardConfig;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        seeds = [GUARD_CONFIG_SEED],
        bump = guard_config.bump,
    )]
    pub guard_config: Account<'info, GuardConfig>,

    pub mint: Account<'info, Mint>,

    /// PDA-owned token account for escrowing funds
    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = vault_token_account,
        seeds = [VAULT_SEED, mint.key().as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Must be the guard authority
    #[account(
        mut,
        constraint = authority.key() == guard_config.authority,
    )]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeVault>) -> Result<()> {
    msg!(
        "Vault initialized for mint: {}",
        ctx.accounts.mint.key()
    );
    Ok(())
}
