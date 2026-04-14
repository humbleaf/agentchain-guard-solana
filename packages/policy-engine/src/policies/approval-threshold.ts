import type { Policy, PolicyInput, PolicyOutput } from './types.js'

/**
 * approval-threshold — Actions above a threshold require human approval.
 * Returns PENDING_APPROVAL instead of PASS or DENY.
 */
export class ApprovalThresholdPolicy implements Policy {
  name = 'approval-threshold'
  private threshold: number

  constructor(threshold = 200_000_000) { // 200 USDC default
    this.threshold = threshold
  }

  async evaluate(input: PolicyInput): Promise<PolicyOutput> {
    if (input.amount >= this.threshold) {
      return {
        name: this.name,
        verdict: 'PENDING_APPROVAL',
        reason: `Amount ${input.amount} exceeds approval threshold ${this.threshold}`,
        metadata: { threshold: this.threshold, amount: input.amount },
      }
    }

    return {
      name: this.name,
      verdict: 'PASS',
      reason: `Amount ${input.amount} below approval threshold ${this.threshold}`,
    }
  }
}
