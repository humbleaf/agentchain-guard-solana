import { PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey('HutGfrkJTsaGMC4bs7X2EFsbbP8LaTEDkWsEBM86RGHz')

export const GUARD_CONFIG_SEED = 'guard_config'
export const BUDGET_SEED = 'budget'
export const INTENT_SEED = 'intent'
export const APPROVAL_SEED = 'approval'
export const VAULT_SEED = 'vault'

export const Status = {
  PROPOSED: 0,
  PENDING_APPROVAL: 1,
  DENIED: 2,
  APPROVED_READY: 3,
  SETTLED: 4,
  REFUNDED: 5,
  EXPIRED: 6,
} as const

export const ActionType = {
  API_PAYMENT: 0,
  REWARD_PAYOUT: 1,
  TREASURY_TRANSFER: 2,
} as const

export const PolicyVerdict = {
  PASS: 0,
  DENY: 1,
  PENDING_APPROVAL: 2,
  ERROR: 3,
} as const
