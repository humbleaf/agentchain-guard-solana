import { PublicKey } from '@solana/web3.js'
import type { StatusType, PolicyVerdictType } from './constants.js'

// ── Onchain Account Types ──

export interface GuardConfigAccount {
  authority: PublicKey
  treasuryMint: PublicKey
  receiptSigner: PublicKey
  approvalSigner: PublicKey
  defaultDailyCap: bigint
  totalValueGuarded: bigint
  totalActions: bigint
  totalDenied: bigint
  paused: boolean
  bump: number
}

export interface BudgetAccountData {
  owner: PublicKey
  guardConfig: PublicKey
  scope: Uint8Array
  dailyCap: bigint
  spentToday: bigint
  lastResetUnix: bigint
  lifetimeSpent: bigint
  bump: number
}

export interface ActionIntentAccount {
  id: Uint8Array
  agent: PublicKey
  requester: PublicKey
  recipient: PublicKey
  mint: PublicKey
  amount: bigint
  actionType: number
  status: StatusType
  receiptHash: Uint8Array
  policyVerdict: PolicyVerdictType
  createdAt: bigint
  expiresAt: bigint
  settledAt: bigint
  bump: number
}

export interface ApprovalRecordAccount {
  intent: PublicKey
  intentId: Uint8Array
  approver: PublicKey
  approvedAt: bigint
  bump: number
}

// ── Offchain Types ──

export interface PolicyReceipt {
  intentId: string
  agent: string
  recipient: string
  amount: string
  actionType: number
  verdict: string
  policies: PolicyResult[]
  timestamp: string
}

export interface PolicyResult {
  name: string
  verdict: string
  reason?: string
  metadata?: Record<string, unknown>
}

// ── Action Request (sent to policy engine) ──

export interface ActionRequest {
  intentId: string
  agent: string
  requester: string
  recipient: string
  amount: string
  actionType: number
  mint: string
}
