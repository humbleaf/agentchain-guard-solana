use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HutGfrkJTsaGMC4bs7X2EFsbbP8LaTEDkWsEBM86RGHz");

#[program]
pub mod agentchain_guard {
    use super::*;

    /// Initialize the guard configuration. Called once per deployment.
    pub fn initialize_guard(
        ctx: Context<InitializeGuard>,
        default_daily_cap: u64,
    ) -> Result<()> {
        instructions::initialize_guard::handler(ctx, default_daily_cap)
    }

    /// Initialize a vault token account for a specific mint.
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize_vault::handler(ctx)
    }

    /// Create a budget account for an agent with a daily spend cap.
    pub fn create_budget_account(
        ctx: Context<CreateBudgetAccount>,
        scope: [u8; 32],
        daily_cap: u64,
    ) -> Result<()> {
        instructions::create_budget_account::handler(ctx, scope, daily_cap)
    }

    /// Propose an action intent. Escrows funds into vault.
    /// Policy verdict is passed from offchain policy engine.
    pub fn create_action_intent(
        ctx: Context<CreateActionIntent>,
        intent_id: [u8; 32],
        amount: u64,
        action_type: u8,
        receipt_hash: [u8; 32],
        policy_verdict: u8,
        expires_at: i64,
    ) -> Result<()> {
        instructions::create_action_intent::handler(
            ctx,
            intent_id,
            amount,
            action_type,
            receipt_hash,
            policy_verdict,
            expires_at,
        )
    }

    /// Approve a pending action. Only callable by the approval_signer.
    pub fn approve_action(ctx: Context<ApproveAction>) -> Result<()> {
        instructions::approve_action::handler(ctx)
    }

    /// Deny a pending action. Returns funds to requester.
    pub fn deny_action(ctx: Context<DenyAction>) -> Result<()> {
        instructions::deny_action::handler(ctx)
    }

    /// Settle an approved action. Transfers funds from vault to recipient.
    pub fn settle_action(ctx: Context<SettleAction>) -> Result<()> {
        instructions::settle_action::handler(ctx)
    }

    /// Refund a denied or expired action. Returns funds to requester.
    pub fn refund_action(ctx: Context<RefundAction>) -> Result<()> {
        instructions::refund_action::handler(ctx)
    }

    /// Sweep an expired intent. Anyone can call to reclaim rent.
    pub fn sweep_expired(ctx: Context<SweepExpired>) -> Result<()> {
        instructions::sweep_expired::handler(ctx)
    }
}
