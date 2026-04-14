import { createHash } from 'crypto'

/**
 * Canonical JSON serialization: sorted keys, no whitespace.
 * Single source of truth — policy-engine, SDK, and dashboard
 * all import from here.
 *
 * This is the hash target for receipt verification.
 * The onchain receipt_hash must match this output.
 */
export function canonicalize(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort())
}

/**
 * SHA-256 hash of a canonical JSON receipt.
 * Returns a 32-byte Buffer suitable for passing to the
 * create_action_intent instruction as receipt_hash.
 */
export function hashReceipt(receipt: Record<string, unknown>): Buffer {
  return createHash('sha256').update(canonicalize(receipt)).digest()
}

/**
 * Hex string of the receipt hash (for display/logging).
 */
export function hashReceiptHex(receipt: Record<string, unknown>): string {
  return hashReceipt(receipt).toString('hex')
}
