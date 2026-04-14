use anchor_lang::prelude::*;

/// ActionIntent — Represents a single proposed value-moving action.
///
/// PDA: ["intent", id]
/// Lifecycle: PROPOSED → PENDING_APPROVAL → APPROVED_READY → SETTLED
///                                       → DENIED → REFUNDED
///                                       → EXPIRED (via sweep)
///
/// Funds are escrowed in the vault ATA on creation.
/// Settlement transfers from vault to recipient.
/// Refund returns from vault to requester.
#[account]
#[derive(InitSpace)]
pub struct ActionIntent {
    /// Client-generated unique identifier (UUID bytes)
    pub id: [u8; 32],

    /// The autonomous agent proposing this action
    pub agent: Pubkey,

    /// The wallet funding this action (may differ from agent)
    pub requester: Pubkey,

    /// The destination wallet for settlement
    pub recipient: Pubkey,

    /// The SPL token mint (must match GuardConfig.treasury_mint)
    pub mint: Pubkey,

    /// Amount in token base units
    pub amount: u64,

    /// Action classification: 0=api_payment, 1=reward, 2=treasury
    pub action_type: u8,

    /// Current lifecycle status (see constants::status)
    pub status: u8,

    /// SHA-256 hash of the offchain policy receipt
    pub receipt_hash: [u8; 32],

    /// Policy engine verdict at creation time
    pub policy_verdict: u8,

    /// Unix timestamp of intent creation
    pub created_at: i64,

    /// Unix timestamp after which the intent can be swept
    pub expires_at: i64,

    /// Unix timestamp of settlement (0 if not yet settled)
    pub settled_at: i64,

    /// PDA bump seed
    pub bump: u8,
}
