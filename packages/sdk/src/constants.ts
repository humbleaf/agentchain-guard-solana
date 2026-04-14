import { PublicKey } from '@solana/web3.js'

// ── Program ──
export const PROGRAM_ID = new PublicKey('HutGfrkJTsaGMC4bs7X2EFsbbP8LaTEDkWsEBM86RGHz')

// ── PDA Seeds ──
export const GUARD_CONFIG_SEED = Buffer.from('guard_config')
export const BUDGET_SEED = Buffer.from('budget')
export const INTENT_SEED = Buffer.from('intent')
export const APPROVAL_SEED = Buffer.from('approval')
export const VAULT_SEED = Buffer.from('vault')

// ── Status Constants ──
export const Status = {
  PROPOSED: 0,
  PENDING_APPROVAL: 1,
  DENIED: 2,
  APPROVED_READY: 3,
  SETTLED: 4,
  REFUNDED: 5,
  EXPIRED: 6,
} as const

export type StatusType = (typeof Status)[keyof typeof Status]

// ── UI Label Map (hides internal APPROVED_READY) ──
export const STATUS_LABELS: Record<StatusType, string> = {
  [Status.PROPOSED]: 'Proposed',
  [Status.PENDING_APPROVAL]: 'Pending Approval',
  [Status.DENIED]: 'Denied',
  [Status.APPROVED_READY]: 'Pending Approval', // Hidden from UI
  [Status.SETTLED]: 'Settled',
  [Status.REFUNDED]: 'Refunded',
  [Status.EXPIRED]: 'Expired',
}

// ── Action Types ──
export const ActionType = {
  API_PAYMENT: 0,
  REWARD_PAYOUT: 1,
  TREASURY_TRANSFER: 2,
} as const

// ── Policy Verdicts ──
export const PolicyVerdict = {
  PASS: 0,
  DENY: 1,
  PENDING_APPROVAL: 2,
  ERROR: 3,
} as const

export type PolicyVerdictType = (typeof PolicyVerdict)[keyof typeof PolicyVerdict]
