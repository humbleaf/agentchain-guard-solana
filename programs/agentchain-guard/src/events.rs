use anchor_lang::prelude::*;

#[event]
pub struct IntentCreated {
    pub intent_id: [u8; 32],
    pub agent: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub action_type: u8,
    pub policy_verdict: u8,
    pub timestamp: i64,
}

#[event]
pub struct IntentApproved {
    pub intent_id: [u8; 32],
    pub approver: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct IntentDenied {
    pub intent_id: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct IntentSettled {
    pub intent_id: [u8; 32],
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct IntentRefunded {
    pub intent_id: [u8; 32],
    pub requester: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct IntentExpired {
    pub intent_id: [u8; 32],
    pub timestamp: i64,
}
