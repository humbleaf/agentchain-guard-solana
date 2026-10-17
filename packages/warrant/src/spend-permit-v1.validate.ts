import { canonicalEvmAddress, isSolanaPubkey } from "./spend-permit-v1.codec.js";
import {
  BASE_SEPOLIA_USDC,
  PINNED_USDC_DECIMALS,
  SHARED_LEDGER_AMOUNT_MAX,
  SOLANA_DEVNET_USDC_MINT,
  SPEND_CHAINS,
  SPEND_PERMIT_CANONICALIZATION,
  SPEND_PERMIT_SIGNING_DOMAIN,
  SPEND_PERMIT_VERSION,
  WARRANT_EVIDENCE_SIGNING_DOMAIN,
  type SpendChain,
  type SpendPermitReason,
  type SpendPermitV1,
  type ValidationResult,
} from "./spend-permit-v1.types.js";

const ID = /^[A-Za-z0-9._:-]{1,128}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ATOMIC = /^(0|[1-9][0-9]*)$/;
const U32_MAX = 2 ** 32 - 1;

function fail(reason: SpendPermitReason): ValidationResult {
  return { ok: false, reason };
}

function addressOk(chain: SpendChain, value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (chain === "solana-devnet") return isSolanaPubkey(value);
  return canonicalEvmAddress(value) !== null;
}

/**
 * Fail closed. Does not canonicalize and does not sign.
 * Failure state: `{ ok: false, reason }` for every rejected input, including non-objects.
 */
export function validateSpendPermit(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("UNKNOWN_PERMIT_VERSION");
  const raw = input as Record<string, unknown>;
  const allowed = new Set([
    "permitVersion", "signingDomain", "canonicalization", "chain", "executor", "vault", "agent",
    "recipient", "issuerPubkey", "asset", "assetDecimals", "amount", "permitId", "operationId",
    "replayNonce", "reservationId", "warrantHash", "policyHash", "approvalHash", "issuerKeyId",
    "issuerEpoch", "issuedAt", "expiresAt",
  ]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("UNEXPECTED_FIELD");
  }

  if (raw.signingDomain === WARRANT_EVIDENCE_SIGNING_DOMAIN) return fail("EVIDENCE_DOMAIN_REJECTED");
  if (raw.permitVersion !== SPEND_PERMIT_VERSION) return fail("UNKNOWN_PERMIT_VERSION");
  if (raw.signingDomain !== SPEND_PERMIT_SIGNING_DOMAIN) return fail("DOMAIN_MISMATCH");
  if (raw.canonicalization !== SPEND_PERMIT_CANONICALIZATION) return fail("CANONICALIZATION_MISMATCH");
  if (typeof raw.chain !== "string" || !(SPEND_CHAINS as readonly string[]).includes(raw.chain)) {
    return fail("CHAIN_NOT_ALLOWED");
  }
  const chain = raw.chain as SpendChain;

  const pinned = chain === "solana-devnet" ? SOLANA_DEVNET_USDC_MINT : BASE_SEPOLIA_USDC;
  const asset = chain === "base-sepolia" && typeof raw.asset === "string"
    ? canonicalEvmAddress(raw.asset)
    : raw.asset;
  if (asset !== pinned) return fail("ASSET_NOT_PINNED");
  if (raw.assetDecimals !== PINNED_USDC_DECIMALS) return fail("ASSET_DECIMALS_MISMATCH");

  if (typeof raw.amount !== "string" || !ATOMIC.test(raw.amount)) return fail("AMOUNT_NOT_ATOMIC");
  const amount = BigInt(raw.amount);
  if (amount > SHARED_LEDGER_AMOUNT_MAX) return fail("AMOUNT_OUT_OF_RANGE");

  for (const field of ["executor", "vault", "agent", "recipient", "issuerPubkey"] as const) {
    if (!addressOk(chain, raw[field])) return fail("ADDRESS_INVALID");
  }

  for (const field of ["warrantHash", "policyHash"] as const) {
    if (typeof raw[field] !== "string" || !HASH.test(raw[field])) return fail("HASH_MALFORMED");
  }
  if (raw.approvalHash !== null && (typeof raw.approvalHash !== "string" || !HASH.test(raw.approvalHash))) {
    return fail("HASH_MALFORMED");
  }

  if (typeof raw.issuerEpoch !== "number" || !Number.isInteger(raw.issuerEpoch) || raw.issuerEpoch < 0 || raw.issuerEpoch > U32_MAX) {
    return fail("EPOCH_OUT_OF_RANGE");
  }
  if (
    typeof raw.issuedAt !== "number" ||
    typeof raw.expiresAt !== "number" ||
    !Number.isInteger(raw.issuedAt) ||
    !Number.isInteger(raw.expiresAt) ||
    raw.expiresAt <= raw.issuedAt
  ) {
    return fail("TIME_INVALID");
  }

  for (const field of ["permitId", "operationId", "reservationId", "issuerKeyId"] as const) {
    if (typeof raw[field] !== "string" || !ID.test(raw[field])) return fail("ID_MALFORMED");
  }
  if (typeof raw.replayNonce !== "string" || !ATOMIC.test(raw.replayNonce)) return fail("ID_MALFORMED");

  const executor = chain === "base-sepolia" ? canonicalEvmAddress(raw.executor as string)! : (raw.executor as string);
  const vault = chain === "base-sepolia" ? canonicalEvmAddress(raw.vault as string)! : (raw.vault as string);
  const agent = chain === "base-sepolia" ? canonicalEvmAddress(raw.agent as string)! : (raw.agent as string);
  const recipient = chain === "base-sepolia" ? canonicalEvmAddress(raw.recipient as string)! : (raw.recipient as string);
  const issuerPubkey = chain === "base-sepolia" ? canonicalEvmAddress(raw.issuerPubkey as string)! : (raw.issuerPubkey as string);

  const permit: SpendPermitV1 = {
    permitVersion: SPEND_PERMIT_VERSION,
    signingDomain: SPEND_PERMIT_SIGNING_DOMAIN,
    canonicalization: SPEND_PERMIT_CANONICALIZATION,
    chain,
    executor,
    vault,
    agent,
    recipient,
    issuerPubkey,
    asset: pinned,
    assetDecimals: PINNED_USDC_DECIMALS,
    amount: raw.amount,
    permitId: raw.permitId as string,
    operationId: raw.operationId as string,
    replayNonce: raw.replayNonce,
    reservationId: raw.reservationId as string,
    warrantHash: raw.warrantHash as string,
    policyHash: raw.policyHash as string,
    approvalHash: raw.approvalHash as string | null,
    issuerKeyId: raw.issuerKeyId as string,
    issuerEpoch: raw.issuerEpoch,
    issuedAt: raw.issuedAt,
    expiresAt: raw.expiresAt,
  };
  return { ok: true, permit };
}
