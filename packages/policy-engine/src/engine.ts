import type { Policy, PolicyInput, PolicyVerdict, PolicyOutput, EngineResult } from './policies/types.js'
import { hashReceiptHex } from '@agentguard/sdk'

/**
 * PolicyEngine — Evaluates an action request against all registered policies.
 *
 * Aggregation logic:
 *   - ANY DENY → final verdict is DENY
 *   - ANY PENDING_APPROVAL (and no DENY) → PENDING_APPROVAL
 *   - ALL PASS → PASS
 *   - ANY ERROR → ERROR (if no DENY/PENDING)
 */
export class PolicyEngine {
  private policies: Policy[]

  constructor(policies: Policy[] = []) {
    this.policies = policies
  }

  /**
   * Register a policy. Order doesn't matter — all are evaluated.
   */
  addPolicy(policy: Policy): void {
    this.policies.push(policy)
  }

  /**
   * Evaluate all policies against an input. Returns aggregated verdict.
   */
  async evaluate(input: PolicyInput): Promise<EngineResult> {
    // Run all policies in parallel
    const results: PolicyOutput[] = await Promise.all(
      this.policies.map(p => p.evaluate(input)),
    )

    // Aggregate verdict
    const verdict = this.aggregateVerdict(results)

    // Build receipt
    const receipt: Record<string, unknown> = {
      intentId: input.intentId,
      agent: input.agent,
      recipient: input.recipient,
      amount: String(input.amount),
      actionType: input.actionType,
      verdict,
      policies: results.map(r => ({
        name: r.name,
        verdict: r.verdict,
        reason: r.reason,
      })),
      timestamp: new Date(input.timestamp * 1000).toISOString(),
    }

    const receiptHash = hashReceiptHex(receipt)

    return {
      verdict,
      results,
      receipt,
      receiptHash,
    }
  }

  private aggregateVerdict(results: PolicyOutput[]): PolicyVerdict {
    // DENY takes priority
    if (results.some(r => r.verdict === 'DENY')) return 'DENY'
    // PENDING_APPROVAL second
    if (results.some(r => r.verdict === 'PENDING_APPROVAL')) return 'PENDING_APPROVAL'
    // ERROR third
    if (results.some(r => r.verdict === 'ERROR')) return 'ERROR'
    // All pass
    return 'PASS'
  }

  /**
   * Get the list of registered policy names.
   */
  getPolicyNames(): string[] {
    return this.policies.map(p => p.name)
  }
}
