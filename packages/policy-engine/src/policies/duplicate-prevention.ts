import type { Policy, PolicyInput, PolicyOutput } from './types.js'

/**
 * duplicate-prevention — Rejects action intents with the same intentId.
 * Uses an in-memory set (sufficient for hackathon demo).
 * Production: replace with Redis SET NX with TTL.
 */
export class DuplicatePreventionPolicy implements Policy {
  name = 'duplicate-prevention'
  private seen: Set<string>

  constructor() {
    this.seen = new Set()
  }

  async evaluate(input: PolicyInput): Promise<PolicyOutput> {
    if (this.seen.has(input.intentId)) {
      return {
        name: this.name,
        verdict: 'DENY',
        reason: `Duplicate intent ID: ${input.intentId}`,
      }
    }

    this.seen.add(input.intentId)

    return {
      name: this.name,
      verdict: 'PASS',
      reason: 'Intent ID is unique',
    }
  }
}
