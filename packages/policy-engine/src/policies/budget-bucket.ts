import type { Policy, PolicyInput, PolicyOutput } from './types.js'

/**
 * budget-bucket — Tracks per-agent daily spend (offchain mirror of onchain budget).
 * This is an advisory check — the onchain BudgetAccount is the source of truth.
 * The offchain version enables fast pre-flight rejection before
 * paying for an onchain transaction.
 */
export class BudgetBucketPolicy implements Policy {
  name = 'budget-bucket'
  private dailyCap: number
  private spent: Map<string, { amount: number; resetAt: number }>

  constructor(dailyCap = 500_000_000) { // 500 USDC default
    this.dailyCap = dailyCap
    this.spent = new Map()
  }

  async evaluate(input: PolicyInput): Promise<PolicyOutput> {
    const key = input.agent
    const now = input.timestamp
    let record = this.spent.get(key)

    // Lazy reset (mirrors onchain behavior)
    if (!record || now - record.resetAt >= 86_400) {
      record = { amount: 0, resetAt: now }
      this.spent.set(key, record)
    }

    const projected = record.amount + input.amount
    if (projected > this.dailyCap) {
      return {
        name: this.name,
        verdict: 'DENY',
        reason: `Daily budget exceeded. Spent: ${record.amount}, Requested: ${input.amount}, Cap: ${this.dailyCap}`,
        metadata: {
          spent: record.amount,
          requested: input.amount,
          dailyCap: this.dailyCap,
          remaining: this.dailyCap - record.amount,
        },
      }
    }

    // Pre-commit the spend (will be reverted if intent creation fails)
    record.amount = projected
    this.spent.set(key, record)

    return {
      name: this.name,
      verdict: 'PASS',
      reason: `Within daily budget. Spent: ${projected}/${this.dailyCap}`,
      metadata: { spent: projected, dailyCap: this.dailyCap },
    }
  }
}
