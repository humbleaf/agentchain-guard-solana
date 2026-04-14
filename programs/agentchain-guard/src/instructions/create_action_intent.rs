use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::error::GuardError;
use crate::events::IntentCreated;
use crate::state::{GuardConfig, BudgetAccount, ActionIntent};

#[derive(Accounts)]
#[instruction(intent_id: [u8; 32])]
pub struct CreateActionIntent<'info> {
    #[account(
        mut,
        seeds = [GUARD_CONFIG_SEED],
        bump = guard_config.bump,
        constraint = !guard_config.paused @ GuardError::GuardPaused,
    )]
    pub guard_config: Account<'info, GuardConfig>,

    #[account(
        init,
        payer = requester,
        space = 8 + ActionIntent::INIT_SPACE,
        seeds = [INTENT_SEED, intent_id.as_ref()],
        bump,
    )]
    pub action_intent: Account<'info, ActionIntent>,

    /// Budget account for the agent — checked for daily cap
    #[account(
        mut,
        seeds = [BUDGET_SEED, agent.key().as_ref(), budget_account.scope.as_ref()],
        bump = budget_account.bump,
        constraint = budget_account.guard_config == guard_config.key(),
    )]
    pub budget_account: Account<'info, BudgetAccount>,

    /// PDA-owned vault for escrowing funds
    #[account(
        mut,
        seeds = [VAULT_SEED, guard_config.treasury_mint.as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Requester's token account (source of funds)
    #[account(
        mut,
        constraint = requester_token_account.mint == guard_config.treasury_mint,
        constraint = requester_token_account.owner == requester.key(),
    )]
    pub requester_token_account: Account<'info, TokenAccount>,

    /// The autonomous agent proposing this action
    /// CHECK: Agent identity is verified via budget account PDA seeds
    pub agent: UncheckedAccount<'info>,

    /// The recipient wallet for settlement
    /// CHECK: Any pubkey can be a recipient
    pub recipient: UncheckedAccount<'info>,

    /// The wallet funding this action (signs the transaction)
    #[account(mut)]
    pub requester: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateActionIntent>,
    intent_id: [u8; 32],
    amount: u64,
    action_type: u8,
    receipt_hash: [u8; 32],
    policy_verdict: u8,
    expires_at: i64,
) -> Result<()> {
    // ── Validate inputs ──
    require!(amount > 0, GuardError::ZeroAmount);
    require!(
        action_type <= action_type::TREASURY_TRANSFER,
        GuardError::InvalidActionType,
    );

    let clock = Clock::get()?;
    require!(expires_at > clock.unix_timestamp, GuardError::InvalidExpiry);

    // ── Lazy budget reset (Gap G-3 fix) ──
    let budget = &mut ctx.accounts.budget_account;
    if clock.unix_timestamp - budget.last_reset_unix >= SECONDS_PER_DAY {
        budget.spent_today = 0;
        budget.last_reset_unix = clock.unix_timestamp;
    }

    // ── Budget enforcement ──
    require!(
        budget.spent_today.checked_add(amount).unwrap_or(u64::MAX) <= budget.daily_cap,
        GuardError::BudgetExceeded,
    );

    // ── Determine initial status based on policy verdict ──
    let initial_status = match policy_verdict {
        policy_verdict::PASS => status::PROPOSED,
        policy_verdict::DENY => {
            // Denied at creation — still record the intent for audit trail,
            // but do NOT escrow funds.
            let intent = &mut ctx.accounts.action_intent;
            intent.id = intent_id;
            intent.agent = ctx.accounts.agent.key();
            intent.requester = ctx.accounts.requester.key();
            intent.recipient = ctx.accounts.recipient.key();
            intent.mint = ctx.accounts.guard_config.treasury_mint;
            intent.amount = amount;
            intent.action_type = action_type;
            intent.status = status::DENIED;
            intent.receipt_hash = receipt_hash;
            intent.policy_verdict = policy_verdict;
            intent.created_at = clock.unix_timestamp;
            intent.expires_at = expires_at;
            intent.settled_at = 0;
            intent.bump = ctx.bumps.action_intent;

            // Update guard metrics
            let config = &mut ctx.accounts.guard_config;
            config.total_actions += 1;
            config.total_denied += 1;

            emit!(IntentCreated {
                intent_id,
                agent: ctx.accounts.agent.key(),
                recipient: ctx.accounts.recipient.key(),
                amount,
                action_type,
                policy_verdict,
                timestamp: clock.unix_timestamp,
            });

            return Ok(());
        }
        policy_verdict::PENDING_APPROVAL => status::PENDING_APPROVAL,
        _ => status::PROPOSED, // ERROR verdict → still propose, handle offchain
    };

    // ── Escrow funds: transfer from requester to vault ──
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.requester_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.requester.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    // ── Update budget ──
    budget.spent_today = budget.spent_today.checked_add(amount).unwrap();
    budget.lifetime_spent = budget.lifetime_spent.checked_add(amount).unwrap();

    // ── Write intent state ──
    let intent = &mut ctx.accounts.action_intent;
    intent.id = intent_id;
    intent.agent = ctx.accounts.agent.key();
    intent.requester = ctx.accounts.requester.key();
    intent.recipient = ctx.accounts.recipient.key();
    intent.mint = ctx.accounts.guard_config.treasury_mint;
    intent.amount = amount;
    intent.action_type = action_type;
    intent.status = initial_status;
    intent.receipt_hash = receipt_hash;
    intent.policy_verdict = policy_verdict;
    intent.created_at = clock.unix_timestamp;
    intent.expires_at = expires_at;
    intent.settled_at = 0;
    intent.bump = ctx.bumps.action_intent;

    // ── Update guard metrics ──
    let config = &mut ctx.accounts.guard_config;
    config.total_actions += 1;

    emit!(IntentCreated {
        intent_id,
        agent: ctx.accounts.agent.key(),
        recipient: ctx.accounts.recipient.key(),
        amount,
        action_type,
        policy_verdict,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Intent created: {:?}, amount: {}, status: {}",
        &intent_id[..8],
        amount,
        initial_status,
    );

    Ok(())
}
