use anchor_lang::prelude::*;

// ── PDA Seeds ────────────────────────────────────────────────────

pub const GUARD_CONFIG_SEED: &[u8] = b"guard_config";
pub const BUDGET_SEED: &[u8] = b"budget";
pub const INTENT_SEED: &[u8] = b"intent";
pub const APPROVAL_SEED: &[u8] = b"approval";
pub const VAULT_SEED: &[u8] = b"vault";

// ── Intent Status ────────────────────────────────────────────────
// UI maps these to 6 visible labels (APPROVED_READY shows as "Pending Approval")

pub mod status {
    pub const PROPOSED: u8 = 0;
    pub const PENDING_APPROVAL: u8 = 1;
    pub const DENIED: u8 = 2;
    pub const APPROVED_READY: u8 = 3;
    pub const SETTLED: u8 = 4;
    pub const REFUNDED: u8 = 5;
    pub const EXPIRED: u8 = 6;
}

// ── Action Types ─────────────────────────────────────────────────

pub mod action_type {
    pub const API_PAYMENT: u8 = 0;
    pub const REWARD_PAYOUT: u8 = 1;
    pub const TREASURY_TRANSFER: u8 = 2;
}

// ── Policy Verdicts ──────────────────────────────────────────────

pub mod policy_verdict {
    pub const PASS: u8 = 0;
    pub const DENY: u8 = 1;
    pub const PENDING_APPROVAL: u8 = 2;
    pub const ERROR: u8 = 3;
}

// ── Time Constants ───────────────────────────────────────────────

/// Seconds in a day — used for lazy budget reset
pub const SECONDS_PER_DAY: i64 = 86_400;

/// Default intent expiry: 24 hours
pub const DEFAULT_EXPIRY_SECONDS: i64 = 86_400;
