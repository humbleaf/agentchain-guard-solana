use anchor_lang::prelude::*;

#[error_code]
pub enum GuardError {
    #[msg("Guard is paused")]
    GuardPaused,

    #[msg("Action is not in pending approval state")]
    InvalidApprovalState,

    #[msg("Action is not settleable")]
    ActionNotSettleable,

    #[msg("Action is not refundable")]
    ActionNotRefundable,

    #[msg("Action has expired")]
    ActionExpired,

    #[msg("Unauthorized approver")]
    UnauthorizedApprover,

    #[msg("Action not yet expired")]
    ActionNotExpired,

    #[msg("Invalid action type")]
    InvalidActionType,

    #[msg("Budget exceeded")]
    BudgetExceeded,

    #[msg("Amount is zero")]
    ZeroAmount,

    #[msg("Invalid expiry")]
    InvalidExpiry,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Policy verdict is DENY — action rejected at creation")]
    PolicyDenied,
}
