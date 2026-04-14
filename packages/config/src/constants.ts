export const PROGRAM_ID = 'HutGfrkJTsaGMC4bs7X2EFsbbP8LaTEDkWsEBM86RGHz'

// USDC has 6 decimal places
export const TOKEN_DECIMALS = 6

// Demo amounts (in base units)
export const DEMO_AMOUNTS = {
  ALLOWED_PAYMENT: 3_000_000,    // 3 USDC — passes all policies
  BLOCKED_PAYMENT: 50_000_000,   // 50 USDC — blocked by allowlist
  APPROVAL_PAYMENT: 250_000_000, // 250 USDC — triggers approval threshold
} as const

// Demo agent names (for UI labels)
export const DEMO_AGENTS = {
  ALLOWED: 'agent-api-consumer',
  BLOCKED: 'agent-rogue-spender',
  APPROVAL: 'agent-ecosystem-rewards',
} as const
