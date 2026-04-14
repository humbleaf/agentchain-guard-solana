import type { Policy, PolicyInput, PolicyOutput } from './types.js'

/**
 * allowlist — Only permits actions to pre-approved recipient addresses.
 * Anything not on the allowlist is DENIED.
 */
export class AllowlistPolicy implements Policy {
  name = 'allowlist'
  private allowed: Set<string>

  constructor(allowedAddresses: string[] = []) {
    this.allowed = new Set(allowedAddresses.map(a => a.toLowerCase()))
  }

  async evaluate(input: PolicyInput): Promise<PolicyOutput> {
    const recipientLower = input.recipient.toLowerCase()

    if (this.allowed.size === 0) {
      // Empty allowlist = all allowed (open mode for demo)
      return {
        name: this.name,
        verdict: 'PASS',
        reason: 'Allowlist is empty — open mode',
      }
    }

    if (this.allowed.has(recipientLower)) {
      return {
        name: this.name,
        verdict: 'PASS',
        reason: `Recipient ${input.recipient} is on the allowlist`,
      }
    }

    return {
      name: this.name,
      verdict: 'DENY',
      reason: `Recipient ${input.recipient} is NOT on the allowlist`,
      metadata: { recipient: input.recipient, allowlistSize: this.allowed.size },
    }
  }

  addAddress(address: string): void {
    this.allowed.add(address.toLowerCase())
  }

  removeAddress(address: string): void {
    this.allowed.delete(address.toLowerCase())
  }
}
