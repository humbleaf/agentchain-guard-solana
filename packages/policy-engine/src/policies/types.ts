/**
 * Policy type definitions — shared across all policy implementations.
 */

export type PolicyVerdict = 'PASS' | 'DENY' | 'PENDING_APPROVAL' | 'ERROR'

export interface PolicyInput {
  intentId: string
  agent: string
  requester: string
  recipient: string
  amount: number         // base units (e.g. 3_000_000 for 3 USDC)
  actionType: number
  mint: string
  timestamp: number
}

export interface PolicyOutput {
  name: string
  verdict: PolicyVerdict
  reason: string
  metadata?: Record<string, unknown>
}

export interface Policy {
  name: string
  evaluate(input: PolicyInput): Promise<PolicyOutput>
}

export interface EngineResult {
  verdict: PolicyVerdict
  results: PolicyOutput[]
  receipt: Record<string, unknown>
  receiptHash: string
}
