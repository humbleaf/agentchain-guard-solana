import { PublicKey } from '@solana/web3.js'
import {
  PROGRAM_ID,
  GUARD_CONFIG_SEED,
  BUDGET_SEED,
  INTENT_SEED,
  APPROVAL_SEED,
  VAULT_SEED,
} from './constants.js'

/**
 * Derive the GuardConfig PDA address.
 */
export function findGuardConfigAddress(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [GUARD_CONFIG_SEED],
    PROGRAM_ID,
  )
}

/**
 * Derive a BudgetAccount PDA address.
 */
export function findBudgetAddress(
  owner: PublicKey,
  scope: Uint8Array,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BUDGET_SEED, owner.toBuffer(), Buffer.from(scope)],
    PROGRAM_ID,
  )
}

/**
 * Derive an ActionIntent PDA address.
 */
export function findIntentAddress(
  intentId: Uint8Array,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [INTENT_SEED, Buffer.from(intentId)],
    PROGRAM_ID,
  )
}

/**
 * Derive an ApprovalRecord PDA address.
 */
export function findApprovalAddress(
  intentId: Uint8Array,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [APPROVAL_SEED, Buffer.from(intentId)],
    PROGRAM_ID,
  )
}

/**
 * Derive the Vault token account PDA address.
 */
export function findVaultAddress(
  mint: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, mint.toBuffer()],
    PROGRAM_ID,
  )
}
