use anchor_lang::prelude::*;

/// GuardConfig — Singleton program configuration.
///
/// PDA: ["guard_config"]
/// Created once via `initialize_guard`. Stores administrative keys
/// and cumulative metrics for the dashboard.
#[account]
#[derive(InitSpace)]
pub struct GuardConfig {
    /// Authority that can pause/unpause and update config
    pub authority: Pubkey,

    /// SPL token mint used for all settlements (e.g. mock USDC)
    pub treasury_mint: Pubkey,

    /// Key used to verify offchain receipt signatures (Ed25519)
    pub receipt_signer: Pubkey,

    /// Key authorized to approve/deny pending actions
    pub approval_signer: Pubkey,

    /// Default daily spend cap for new budget accounts
    pub default_daily_cap: u64,

    /// Cumulative value of all settled actions (dashboard metric)
    pub total_value_guarded: u64,

    /// Total number of intents created
    pub total_actions: u64,

    /// Total number of denied actions
    pub total_denied: u64,

    /// Emergency pause — blocks all new intents and settlements
    pub paused: bool,

    /// PDA bump seed
    pub bump: u8,
}
