use anchor_lang::prelude::*;

/// BudgetAccount — Per-agent daily spend tracking.
///
/// PDA: ["budget", owner, scope]
/// Supports lazy reset: when `create_action_intent` checks the budget,
/// it resets `spent_today` if 24h+ have elapsed since `last_reset_unix`.
/// No cron required.
#[account]
#[derive(InitSpace)]
pub struct BudgetAccount {
    /// The agent/wallet this budget applies to
    pub owner: Pubkey,

    /// Backlink to the parent GuardConfig for validation
    pub guard_config: Pubkey,

    /// Scope discriminator (e.g. hash of department/team/project)
    pub scope: [u8; 32],

    /// Maximum daily spend in token base units
    pub daily_cap: u64,

    /// Amount spent in the current day window
    pub spent_today: u64,

    /// Unix timestamp of the last budget reset
    pub last_reset_unix: i64,

    /// Lifetime cumulative spend (analytics)
    pub lifetime_spent: u64,

    /// PDA bump seed
    pub bump: u8,
}
