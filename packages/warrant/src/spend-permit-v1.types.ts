/**
 * SpendPermitV1 — executable, chain-bound authorization.
 * AuthorityWarrantV0 stays hash-only and is referenced, never extended.
 * Signing domain `spend-permit-v1` cannot be reused as `warrant-evidence-v1`.
 */

export const SPEND_PERMIT_VERSION = "spend-permit-v1" as const;
export const SPEND_PERMIT_SIGNING_DOMAIN = "spend-permit-v1" as const;
export const WARRANT_EVIDENCE_SIGNING_DOMAIN = "warrant-evidence-v1" as const;
export const SPEND_PERMIT_CANONICALIZATION = "jcs-rfc8785-v1" as const;

/** Tonight's allowlist. Any other network id is a refusal. */
export const SPEND_CHAINS = ["solana-devnet", "base-sepolia"] as const;
export type SpendChain = (typeof SPEND_CHAINS)[number];

export const SOLANA_DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const BASE_SEPOLIA_USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
export const PINNED_USDC_DECIMALS = 6 as const;

/** Shared ledger uses one atomic precision. Both chains reject above u64. */
export const SHARED_LEDGER_AMOUNT_MAX = (1n << 64n) - 1n;

export const BASE_SEPOLIA_CHAIN_ID = 84532 as const;
export const EVM_MAINNET_CHAIN_IDS = [1, 8453] as const;

export type SpendPermitReason =
  | "UNKNOWN_PERMIT_VERSION"
  | "DOMAIN_MISMATCH"
  | "CANONICALIZATION_MISMATCH"
  | "CHAIN_NOT_ALLOWED"
  | "ASSET_NOT_PINNED"
  | "ASSET_DECIMALS_MISMATCH"
  | "AMOUNT_NOT_ATOMIC"
  | "AMOUNT_OUT_OF_RANGE"
  | "ADDRESS_INVALID"
  | "HASH_MALFORMED"
  | "EPOCH_OUT_OF_RANGE"
  | "TIME_INVALID"
  | "ID_MALFORMED"
  | "EVIDENCE_DOMAIN_REJECTED"
  | "UNEXPECTED_FIELD";

export interface SpendPermitV1 {
  permitVersion: typeof SPEND_PERMIT_VERSION;
  signingDomain: typeof SPEND_PERMIT_SIGNING_DOMAIN;
  canonicalization: typeof SPEND_PERMIT_CANONICALIZATION;
  chain: SpendChain;
  /** Program id or contract address that must execute this permit. */
  executor: string;
  /** Operator-funded vault. Not the agent token account. */
  vault: string;
  /** Agent request key. On Base this is also the required msg.sender. */
  agent: string;
  recipient: string;
  /** On-chain issuer key the executor must observe. Not a self-declared trust anchor. */
  issuerPubkey: string;
  asset: string;
  assetDecimals: typeof PINNED_USDC_DECIMALS;
  /** Integer atomic units. Never a display amount. */
  amount: string;
  permitId: string;
  /** Stable business payment id. Survives retries. Does not migrate chains while executable. */
  operationId: string;
  /** Distinct from permitId. Single-use at the executor. */
  replayNonce: string;
  reservationId: string;
  /** Reference to AuthorityWarrantV0. Not a copy of its fields. */
  warrantHash: string;
  policyHash: string;
  /** Null when no human approval was required. A server record hash, not an operator signature. */
  approvalHash: string | null;
  issuerKeyId: string;
  issuerEpoch: number;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Outstanding ability to spend. Not an HTTP request lifetime.
 * RELEASED is legal only after proven non-executability or a confirmed effect.
 * There is no timeout-release reason.
 */
export type ReservationState = "HELD" | "CONFIRMED" | "RELEASED";

export interface SpendReservationV1 {
  reservationId: string;
  operationId: string;
  chain: SpendChain;
  amount: string;
  state: ReservationState;
  /** Set before any executable signature leaves the process. */
  permitDigest: string | null;
  releaseReason: "CONFIRMED_EFFECT" | "PROVEN_NON_EXECUTABLE" | null;
}

export type ValidationResult =
  | { ok: true; permit: SpendPermitV1 }
  | { ok: false; reason: SpendPermitReason };
