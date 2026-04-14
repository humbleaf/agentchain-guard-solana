use anchor_lang::prelude::*;
use crate::constants::{GUARD_CONFIG_SEED, BUDGET_SEED};
use crate::state::{GuardConfig, BudgetAccount};

#[derive(Accounts)]
#[instruction(scope: [u8; 32])]
pub struct CreateBudgetAccount<'info> {
    #[account(
        seeds = [GUARD_CONFIG_SEED],
        bump = guard_config.bump,
    )]
    pub guard_config: Account<'info, GuardConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + BudgetAccount::INIT_SPACE,
        seeds = [BUDGET_SEED, owner.key().as_ref(), scope.as_ref()],
        bump,
    )]
    pub budget_account: Account<'info, BudgetAccount>,

    /// The agent/wallet this budget applies to
    /// CHECK: Any pubkey can be a budget owner
    pub owner: UncheckedAccount<'info>,

    /// Must be the guard authority
    #[account(
        mut,
        constraint = authority.key() == guard_config.authority,
    )]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateBudgetAccount>,
    scope: [u8; 32],
    daily_cap: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let budget = &mut ctx.accounts.budget_account;

    budget.owner = ctx.accounts.owner.key();
    budget.guard_config = ctx.accounts.guard_config.key();
    budget.scope = scope;
    budget.daily_cap = daily_cap;
    budget.spent_today = 0;
    budget.last_reset_unix = clock.unix_timestamp;
    budget.lifetime_spent = 0;
    budget.bump = ctx.bumps.budget_account;

    msg!(
        "Budget created. Owner: {}, Cap: {}, Scope: {:?}",
        budget.owner,
        budget.daily_cap,
        &scope[..8],
    );

    Ok(())
}
