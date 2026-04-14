// Event type stubs — will be populated from IDL after first full build.
// For now, these match the Rust event structs.

export interface IntentCreatedEvent {
  intentId: number[]
  agent: string
  recipient: string
  amount: bigint
  actionType: number
  policyVerdict: number
  timestamp: bigint
}

export interface IntentSettledEvent {
  intentId: number[]
  recipient: string
  amount: bigint
  timestamp: bigint
}

export interface IntentDeniedEvent {
  intentId: number[]
  timestamp: bigint
}

export interface IntentApprovedEvent {
  intentId: number[]
  approver: string
  timestamp: bigint
}

export interface IntentRefundedEvent {
  intentId: number[]
  requester: string
  amount: bigint
  timestamp: bigint
}

export interface IntentExpiredEvent {
  intentId: number[]
  timestamp: bigint
}
