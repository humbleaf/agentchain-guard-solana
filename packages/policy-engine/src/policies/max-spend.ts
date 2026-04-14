import type { Policy, PolicyInput, PolicyOutput } from './types.js'

const DEFAULT_MAX_AMOUNT = 100_000_000 // 100 USDC (6 decimals)

/**
 * max-spend — Rejects any single action exceeding the max amount.
 * Simplest policy: pure function, no state.
 */
export class MaxSpendPolicy implements Policy {
  name = 'max-spend'
  private maxAmount: number

  constructor(maxAmount = DEFAULT_MAX_AMOUNT) {
    this.maxAmount = maxAmount
  }

  async evaluate(input: PolicyInput): Promise<PolicyOutput> {
    if (input.amount > this.maxAmount) {
      return {
        name: this.name,
        verdict: 'DENY',
        reason: `Amount ${input.amount} exceeds max spend limit ${this.maxAmount}`,
        metadata: { maxAmount: this.maxAmount, requestedAmount: input.amount },
      }
    }

    return {
      name: this.name,
      verdict: 'PASS',
      reason: `Amount ${input.amount} within max spend limit ${this.maxAmount}`,
    }
  }
}
