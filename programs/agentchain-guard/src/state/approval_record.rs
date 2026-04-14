use anchor_lang::prelude::*;

/// ApprovalRecord — Records a human approval decision for an intent.
///
/// PDA: ["approval", intent_id]
/// Created when `approve_action` is called. One approval per intent.
/// Can be extended to N-of-M quorum in Phase 5.
#[account]
#[derive(InitSpace)]
pub struct ApprovalRecord {
    /// The ActionIntent account this approval references
    pub intent: Pubkey,

    /// The intent ID for reverse lookup
    pub intent_id: [u8; 32],

    /// The pubkey that signed the approval
    pub approver: Pubkey,

    /// Unix timestamp of approval
    pub approved_at: i64,

    /// PDA bump seed
    pub bump: u8,
}
