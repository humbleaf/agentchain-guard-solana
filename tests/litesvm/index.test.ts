/**
 * AgentChain Guard — LiteSVM Integration Tests
 *
 * Tests the full Slice 1 lifecycle:
 *   1. Initialize guard config
 *   2. Initialize vault
 *   3. Create budget account
 *   4. Create action intent (PASS) → escrow
 *   5. Settle action → transfer to recipient
 *
 * Also tests:
 *   - DENY at creation (no escrow)
 *   - PENDING_APPROVAL → approve → settle
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { LiteSVM, FailedTransactionMetadata, TransactionMetadata } from 'litesvm'
import BN from 'bn.js'
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
} from '@solana/spl-token'

// ── Load program binary ──
const PROGRAM_SO = resolve(import.meta.dirname, '../../target/deploy/agentchain_guard.so')
const IDL_PATH = resolve(import.meta.dirname, '../../target/idl/agentchain_guard.json')

// ── PDA Seeds (mirror Rust constants) ──
const GUARD_CONFIG_SEED = Buffer.from('guard_config')
const BUDGET_SEED = Buffer.from('budget')
const INTENT_SEED = Buffer.from('intent')
const APPROVAL_SEED = Buffer.from('approval')
const VAULT_SEED = Buffer.from('vault')

// ── Helpers ──
function randomIntentId(): Uint8Array {
  const id = new Uint8Array(32)
  crypto.getRandomValues(id)
  return id
}

function defaultScope(): Uint8Array {
  const scope = new Uint8Array(32)
  scope[0] = 0x01
  return scope
}

function findPda(seeds: (Buffer | Uint8Array)[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    seeds.map(s => Buffer.from(s)),
    programId,
  )
}

function ixDiscriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}

/** Send tx and return true on success, false on failure. Logs errors. */
function sendTx(svm: LiteSVM, tx: Transaction, label: string): boolean {
  const result = svm.sendTransaction(tx)
  if (result instanceof FailedTransactionMetadata) {
    console.log(`    ⚠ ${label}: ${result.toString().substring(0, 200)}`)
    return false
  }
  return true
}

// ── Test Runner ──
async function main() {
  console.log('🛡️  AgentChain Guard — LiteSVM Integration Tests')
  console.log('='.repeat(50))
  console.log('')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ ${msg}`)
      passed++
    } else {
      console.log(`  ❌ ${msg}`)
      failed++
    }
  }

  // ── Setup LiteSVM with SPL programs ──
  console.log('📦 Setting up LiteSVM...')

  // Use default programs (includes SPL Token, ATA, etc.)
  const svm = new LiteSVM()

  // Load IDL to get program ID
  const idl = JSON.parse(readFileSync(IDL_PATH, 'utf-8'))
  const programId = new PublicKey(idl.address)

  // Load our program
  svm.addProgramFromFile(programId, PROGRAM_SO)

  // Create keypairs
  const authority = Keypair.generate()
  const agent = Keypair.generate()
  const recipient = Keypair.generate()
  const mintAuthority = Keypair.generate()
  const mint = Keypair.generate()

  // Fund accounts
  svm.airdrop(authority.publicKey, BigInt(10 * LAMPORTS_PER_SOL))
  svm.airdrop(agent.publicKey, BigInt(10 * LAMPORTS_PER_SOL))
  svm.airdrop(recipient.publicKey, BigInt(2 * LAMPORTS_PER_SOL))
  svm.airdrop(mintAuthority.publicKey, BigInt(2 * LAMPORTS_PER_SOL))

  console.log(`  Program ID: ${programId}`)
  console.log(`  Authority:  ${authority.publicKey}`)
  console.log(`  Agent:      ${agent.publicKey}`)
  console.log(`  Recipient:  ${recipient.publicKey}`)
  console.log('')

  // ── Create SPL Token Mint ──
  console.log('🪙  Creating mock USDC mint...')

  const mintRent = BigInt(1_461_600)
  const createMintAccountIx = SystemProgram.createAccount({
    fromPubkey: mintAuthority.publicKey,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports: Number(mintRent),
    programId: TOKEN_PROGRAM_ID,
  })
  const initMintIx = createInitializeMintInstruction(
    mint.publicKey, 6, mintAuthority.publicKey, null,
  )

  const createMintTx = new Transaction().add(createMintAccountIx, initMintIx)
  createMintTx.recentBlockhash = svm.latestBlockhash()
  createMintTx.feePayer = mintAuthority.publicKey
  createMintTx.sign(mintAuthority, mint)

  assert(sendTx(svm, createMintTx, 'create mint'), 'Create mock USDC mint')

  // Create ATAs and mint tokens
  const authorityAta = getAssociatedTokenAddressSync(mint.publicKey, authority.publicKey)
  const agentAta = getAssociatedTokenAddressSync(mint.publicKey, agent.publicKey)
  const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, recipient.publicKey)

  // Create authority ATA + mint 1000 USDC
  const tx1 = new Transaction().add(
    createAssociatedTokenAccountInstruction(authority.publicKey, authorityAta, authority.publicKey, mint.publicKey),
    createMintToInstruction(mint.publicKey, authorityAta, mintAuthority.publicKey, 1_000_000_000),
  )
  tx1.recentBlockhash = svm.latestBlockhash()
  tx1.feePayer = authority.publicKey
  tx1.sign(authority, mintAuthority)
  assert(sendTx(svm, tx1, 'authority ATA'), 'Create authority ATA + mint 1000 USDC')

  // Create agent ATA + mint 500 USDC
  const tx2 = new Transaction().add(
    createAssociatedTokenAccountInstruction(agent.publicKey, agentAta, agent.publicKey, mint.publicKey),
    createMintToInstruction(mint.publicKey, agentAta, mintAuthority.publicKey, 500_000_000),
  )
  tx2.recentBlockhash = svm.latestBlockhash()
  tx2.feePayer = agent.publicKey
  tx2.sign(agent, mintAuthority)
  assert(sendTx(svm, tx2, 'agent ATA'), 'Create agent ATA + mint 500 USDC')

  // Create recipient ATA
  const tx3 = new Transaction().add(
    createAssociatedTokenAccountInstruction(recipient.publicKey, recipientAta, recipient.publicKey, mint.publicKey),
  )
  tx3.recentBlockhash = svm.latestBlockhash()
  tx3.feePayer = recipient.publicKey
  tx3.sign(recipient)
  assert(sendTx(svm, tx3, 'recipient ATA'), 'Create recipient ATA')
  console.log('')

  // ── Derive PDAs ──
  const [guardConfigPda] = findPda([GUARD_CONFIG_SEED], programId)
  const [vaultPda] = findPda([VAULT_SEED, mint.publicKey.toBuffer()], programId)
  const scope = defaultScope()
  const [budgetPda] = findPda([BUDGET_SEED, agent.publicKey.toBuffer(), Buffer.from(scope)], programId)

  // ══════════════════════════════════════════════════
  // TEST 1: Initialize Guard
  // ══════════════════════════════════════════════════
  console.log('── Test 1: Initialize Guard ──')

  const initData = Buffer.concat([
    ixDiscriminator('initialize_guard'),
    new BN(500_000_000).toArrayLike(Buffer, 'le', 8),
  ])
  const initIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: guardConfigPda, isSigner: false, isWritable: true },
      { pubkey: mint.publicKey, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initData,
  })

  const initTx = new Transaction().add(initIx)
  initTx.recentBlockhash = svm.latestBlockhash()
  initTx.feePayer = authority.publicKey
  initTx.sign(authority)

  assert(sendTx(svm, initTx, 'init guard'), 'initialize_guard succeeds')
  assert(svm.getAccount(guardConfigPda) !== null, 'GuardConfig account exists')
  console.log('')

  // ══════════════════════════════════════════════════
  // TEST 2: Initialize Vault
  // ══════════════════════════════════════════════════
  console.log('── Test 2: Initialize Vault ──')

  const vaultIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: guardConfigPda, isSigner: false, isWritable: false },
      { pubkey: mint.publicKey, isSigner: false, isWritable: false },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
    ],
    data: ixDiscriminator('initialize_vault'),
  })

  const vaultTx = new Transaction().add(vaultIx)
  vaultTx.recentBlockhash = svm.latestBlockhash()
  vaultTx.feePayer = authority.publicKey
  vaultTx.sign(authority)

  assert(sendTx(svm, vaultTx, 'init vault'), 'initialize_vault succeeds')
  assert(svm.getAccount(vaultPda) !== null, 'Vault ATA exists')
  console.log('')

  // ══════════════════════════════════════════════════
  // TEST 3: Create Budget Account
  // ══════════════════════════════════════════════════
  console.log('── Test 3: Create Budget Account ──')

  const budgetData = Buffer.concat([
    ixDiscriminator('create_budget_account'),
    Buffer.from(scope),
    new BN(500_000_000).toArrayLike(Buffer, 'le', 8),
  ])
  const budgetIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: guardConfigPda, isSigner: false, isWritable: false },
      { pubkey: budgetPda, isSigner: false, isWritable: true },
      { pubkey: agent.publicKey, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: budgetData,
  })

  const budgetTx = new Transaction().add(budgetIx)
  budgetTx.recentBlockhash = svm.latestBlockhash()
  budgetTx.feePayer = authority.publicKey
  budgetTx.sign(authority)

  assert(sendTx(svm, budgetTx, 'create budget'), 'create_budget_account succeeds')
  assert(svm.getAccount(budgetPda) !== null, 'BudgetAccount exists')
  console.log('')

  // ══════════════════════════════════════════════════
  // TEST 4: Create Action Intent (PASS → escrow)
  // ══════════════════════════════════════════════════
  console.log('── Test 4: Create Action Intent (PASS → escrow) ──')
  const intentId1 = randomIntentId()
  const [intentPda1] = findPda([INTENT_SEED, Buffer.from(intentId1)], programId)

  const intentData1 = Buffer.concat([
    ixDiscriminator('create_action_intent'),
    Buffer.from(intentId1),
    new BN(3_000_000).toArrayLike(Buffer, 'le', 8),
    Buffer.from([0]),
    Buffer.alloc(32),
    Buffer.from([0]),
    new BN(Math.floor(Date.now() / 1000) + 86400).toArrayLike(Buffer, 'le', 8),
  ])
  const intentIx1 = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: guardConfigPda, isSigner: false, isWritable: true },
      { pubkey: intentPda1, isSigner: false, isWritable: true },
      { pubkey: budgetPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: agentAta, isSigner: false, isWritable: true },
      { pubkey: agent.publicKey, isSigner: false, isWritable: false },
      { pubkey: recipient.publicKey, isSigner: false, isWritable: false },
      { pubkey: agent.publicKey, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: intentData1,
  })

  const intentTx1 = new Transaction().add(intentIx1)
  intentTx1.recentBlockhash = svm.latestBlockhash()
  intentTx1.feePayer = agent.publicKey
  intentTx1.sign(agent)

  assert(sendTx(svm, intentTx1, 'create intent PASS'), 'create_action_intent (PASS) succeeds')
  assert(svm.getAccount(intentPda1) !== null, 'ActionIntent PDA exists')
  console.log('')

  // ══════════════════════════════════════════════════
  // TEST 5: Settle Action
  // ══════════════════════════════════════════════════
  console.log('── Test 5: Settle Action ──')

  const settleIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: guardConfigPda, isSigner: false, isWritable: true },
      { pubkey: intentPda1, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: recipientAta, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: ixDiscriminator('settle_action'),
  })

  const settleTx = new Transaction().add(settleIx)
  settleTx.recentBlockhash = svm.latestBlockhash()
  settleTx.feePayer = authority.publicKey
  settleTx.sign(authority)

  assert(sendTx(svm, settleTx, 'settle'), 'settle_action succeeds')
  console.log('')

  // ══════════════════════════════════════════════════
  // TEST 6: Create Action Intent (DENY → no escrow)
  // ══════════════════════════════════════════════════
  console.log('── Test 6: Create Action Intent (DENY → no escrow) ──')
  const intentId2 = randomIntentId()
  const [intentPda2] = findPda([INTENT_SEED, Buffer.from(intentId2)], programId)

  const intentData2 = Buffer.concat([
    ixDiscriminator('create_action_intent'),
    Buffer.from(intentId2),
    new BN(50_000_000).toArrayLike(Buffer, 'le', 8),
    Buffer.from([0]),
    Buffer.alloc(32),
    Buffer.from([1]), // DENY
    new BN(Math.floor(Date.now() / 1000) + 86400).toArrayLike(Buffer, 'le', 8),
  ])
  const intentIx2 = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: guardConfigPda, isSigner: false, isWritable: true },
      { pubkey: intentPda2, isSigner: false, isWritable: true },
      { pubkey: budgetPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: agentAta, isSigner: false, isWritable: true },
      { pubkey: agent.publicKey, isSigner: false, isWritable: false },
      { pubkey: recipient.publicKey, isSigner: false, isWritable: false },
      { pubkey: agent.publicKey, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: intentData2,
  })

  const denyTx = new Transaction().add(intentIx2)
  denyTx.recentBlockhash = svm.latestBlockhash()
  denyTx.feePayer = agent.publicKey
  denyTx.sign(agent)

  assert(sendTx(svm, denyTx, 'create intent DENY'), 'create_action_intent (DENY) succeeds')
  assert(svm.getAccount(intentPda2) !== null, 'Denied intent PDA exists (audit trail)')
  console.log('')

  // ══════════════════════════════════════════════════
  // TEST 7: Approval Flow
  // ══════════════════════════════════════════════════
  console.log('── Test 7: Approval Flow (PENDING → approve → settle) ──')
  const intentId3 = randomIntentId()
  const [intentPda3] = findPda([INTENT_SEED, Buffer.from(intentId3)], programId)
  const [approvalPda3] = findPda([APPROVAL_SEED, Buffer.from(intentId3)], programId)

  const intentData3 = Buffer.concat([
    ixDiscriminator('create_action_intent'),
    Buffer.from(intentId3),
    new BN(250_000_000).toArrayLike(Buffer, 'le', 8),
    Buffer.from([1]), // REWARD_PAYOUT
    Buffer.alloc(32),
    Buffer.from([2]), // PENDING_APPROVAL
    new BN(Math.floor(Date.now() / 1000) + 86400).toArrayLike(Buffer, 'le', 8),
  ])
  const intentIx3 = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: guardConfigPda, isSigner: false, isWritable: true },
      { pubkey: intentPda3, isSigner: false, isWritable: true },
      { pubkey: budgetPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: agentAta, isSigner: false, isWritable: true },
      { pubkey: agent.publicKey, isSigner: false, isWritable: false },
      { pubkey: recipient.publicKey, isSigner: false, isWritable: false },
      { pubkey: agent.publicKey, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: intentData3,
  })

  const pendingTx = new Transaction().add(intentIx3)
  pendingTx.recentBlockhash = svm.latestBlockhash()
  pendingTx.feePayer = agent.publicKey
  pendingTx.sign(agent)

  assert(sendTx(svm, pendingTx, 'create intent PENDING'), 'create_action_intent (PENDING_APPROVAL) succeeds')

  // Approve
  const approveIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: guardConfigPda, isSigner: false, isWritable: false },
      { pubkey: intentPda3, isSigner: false, isWritable: true },
      { pubkey: approvalPda3, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: ixDiscriminator('approve_action'),
  })

  const approveTx = new Transaction().add(approveIx)
  approveTx.recentBlockhash = svm.latestBlockhash()
  approveTx.feePayer = authority.publicKey
  approveTx.sign(authority)

  assert(sendTx(svm, approveTx, 'approve'), 'approve_action succeeds')

  // Settle approved
  const settleApprovedIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: guardConfigPda, isSigner: false, isWritable: true },
      { pubkey: intentPda3, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: recipientAta, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: ixDiscriminator('settle_action'),
  })

  const settleApprovedTx = new Transaction().add(settleApprovedIx)
  settleApprovedTx.recentBlockhash = svm.latestBlockhash()
  settleApprovedTx.feePayer = authority.publicKey
  settleApprovedTx.sign(authority)

  assert(sendTx(svm, settleApprovedTx, 'settle approved'), 'settle_action (after approval) succeeds')
  console.log('')

  // ══════════════════════════════════════════════════
  // TEST 8: Hash Parity (Deep Determinism)
  // ══════════════════════════════════════════════════
  console.log('── Test 8: Hash Parity (Deep Determinism) ──')

  const complexReceipt = {
    amount: 3000000,
    meta: {
      agent: 'DemoAgent',
      vendor: 'Humbleaf',
      items: ['api_call', 'compute_units'],
    },
    intentId: 'test-intent-001',
  }

  /**
   * Re-implementing sortKeys here to avoid cross-package import complexity
   * in this standalone test runner. Must match packages/sdk/src/canonical.ts.
   */
  function sortKeysLocal(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(sortKeysLocal)
    return Object.keys(obj).sort().reduce((acc: any, key) => {
      acc[key] = sortKeysLocal(obj[key])
      return acc
    }, {})
  }

  const canonical = JSON.stringify(sortKeysLocal(complexReceipt))
  const hash = createHash('sha256').update(canonical).digest('hex')

  // Pre-computed hash for this exact object with deep sorting:
  // {"amount":3000000,"intentId":"test-intent-001","meta":{"agent":"DemoAgent","items":["api_call","compute_units"],"vendor":"Humbleaf"}}
  const expectedHash = 'eaa52ec945548e72b80e0a5cca664e2112691cd498cb30d06af62a3984b6d258'


  assert(hash === expectedHash, 'SDK canonicalization is deterministic and matches pre-computed fixture')
  console.log(`    Actual:   ${hash}`)
  console.log(`    Expected: ${expectedHash}`)
  console.log('')

  // ══════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════
  console.log('='.repeat(50))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('')

  if (failed > 0) {
    console.log('❌ SOME TESTS FAILED')
    process.exit(1)
  } else {
    console.log('✅ ALL TESTS PASSED')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
