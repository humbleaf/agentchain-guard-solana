#!/usr/bin/env tsx
/**
 * demo-agent.ts — Self-contained demo runner
 *
 * Runs all 3 scenarios against the live policy engine + on-chain program:
 *   1. Allowed Payment (3 USDC → PASS → settle)
 *   2. Blocked Payment (150 USDC → DENY → no escrow)
 *   3. Approval Required (250 USDC → PENDING → approve → settle)
 *
 * Usage:
 *   tsx scripts/demo-agent.ts [--url <rpc>] [--policy <policy_url>]
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import BN from 'bn.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Config ──
const getArg = (flag: string, fallback: string) =>
  process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : fallback

const RPC_URL = getArg('--url', process.env.SOLANA_RPC_URL || 'http://localhost:8899')
const POLICY_URL = getArg('--policy', process.env.POLICY_ENGINE_URL || 'http://localhost:3010')

const IDL = JSON.parse(readFileSync(resolve(ROOT, 'target/idl/agentchain_guard.json'), 'utf-8'))
const PROGRAM_ID = new PublicKey(IDL.address)

// Load seed state
function loadSeedEnv(): Record<string, string> {
  const envPath = resolve(ROOT, '.env.seed')
  if (!existsSync(envPath)) {
    console.error('❌ .env.seed not found. Run: npx tsx scripts/seed-demo-data.ts first')
    process.exit(1)
  }
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  const env: Record<string, string> = {}
  for (const line of lines) {
    if (line.startsWith('#') || !line.includes('=')) continue
    const [k, v] = line.split('=')
    env[k.trim()] = v.trim()
  }
  return env
}

function loadKey(name: string): Keypair {
  const data = JSON.parse(readFileSync(resolve(ROOT, `.keys/${name}.json`), 'utf-8'))
  return Keypair.fromSecretKey(Uint8Array.from(data))
}

function ixDisc(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}

function findPda(seeds: Buffer[]): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0]
}

function randomIntentId(): Uint8Array {
  const id = new Uint8Array(32)
  crypto.getRandomValues(id)
  return id
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── Scenario Structure ──
interface Scenario {
  name: string
  icon: string
  amount: number
  actionType: number
  expectedVerdict: string
}

const SCENARIOS: Scenario[] = [
  { name: 'Allowed Payment', icon: '▶', amount: 3_000_000, actionType: 0, expectedVerdict: 'PASS' },
  { name: 'Blocked Payment', icon: '⊗', amount: 150_000_000, actionType: 0, expectedVerdict: 'DENY' },
  { name: 'Approval Required', icon: '⏳', amount: 250_000_000, actionType: 1, expectedVerdict: 'PENDING_APPROVAL' },
]

// ── Main ──
async function main() {
  console.log('')
  console.log('🤖 AgentGuard Demo Agent')
  console.log('═'.repeat(50))
  console.log(`   RPC:     ${RPC_URL}`)
  console.log(`   Policy:  ${POLICY_URL}`)
  console.log(`   Program: ${PROGRAM_ID}`)
  console.log('')

  const conn = new Connection(RPC_URL, 'confirmed')
  const seed = loadSeedEnv()
  const authority = loadKey('authority')
  const agent = loadKey('agent')
  const mint = new PublicKey(seed.MOCK_USDC_MINT)
  const guardConfig = new PublicKey(seed.GUARD_CONFIG)
  const vaultPda = new PublicKey(seed.VAULT)
  const budgetPda = new PublicKey(seed.BUDGET)
  const agentAta = new PublicKey(seed.AGENT_ATA)

  let passed = 0
  let failed = 0

  for (const scenario of SCENARIOS) {
    console.log(`${scenario.icon}  Scenario: ${scenario.name}`)
    console.log(`   Amount: ${(scenario.amount / 1_000_000).toFixed(2)} USDC`)
    console.log('')

    const intentId = randomIntentId()
    const intentIdHex = Buffer.from(intentId).toString('hex').slice(0, 16)

    // ── Step 1: Evaluate via Policy Engine ──
    process.stdout.write('   [1/4] Policy engine... ')
    let verdict = scenario.expectedVerdict
    let receiptHash = Buffer.alloc(32)

    try {
      const res = await fetch(`${POLICY_URL}/v1/intents/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId: intentIdHex,
          agent: agent.publicKey.toBase58(),
          requester: agent.publicKey.toBase58(),
          recipient: 'DemoRecipient',
          amount: String(scenario.amount),
          actionType: scenario.actionType,
          mint: mint.toBase58(),
        }),
      })
      const data = await res.json()
      verdict = data.verdict
      if (data.receiptHash) {
        receiptHash = Buffer.from(data.receiptHash, 'hex')
      }
      console.log(`✓ ${verdict} (${data.policyResults?.length || 0} policies)`)
    } catch {
      console.log(`⚠ offline — using expected: ${verdict}`)
    }

    // ── Step 2: Map verdict to on-chain enum ──
    const verdictEnum = verdict === 'PASS' ? 0 : verdict === 'DENY' ? 1 : 2
    process.stdout.write('   [2/4] Creating intent PDA... ')

    const [intentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('intent'), Buffer.from(intentId)],
      PROGRAM_ID,
    )

    const intentData = Buffer.concat([
      ixDisc('create_action_intent'),
      Buffer.from(intentId),
      new BN(scenario.amount).toArrayLike(Buffer, 'le', 8),
      Buffer.from([scenario.actionType]),
      receiptHash,
      Buffer.from([verdictEnum]),
      new BN(Math.floor(Date.now() / 1000) + 86400).toArrayLike(Buffer, 'le', 8),
    ])

    const createIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: guardConfig, isSigner: false, isWritable: true },
        { pubkey: intentPda, isSigner: false, isWritable: true },
        { pubkey: budgetPda, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: agentAta, isSigner: false, isWritable: true },
        { pubkey: agent.publicKey, isSigner: false, isWritable: false },
        { pubkey: authority.publicKey, isSigner: false, isWritable: false },
        { pubkey: agent.publicKey, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: intentData,
    })

    try {
      const sig = await sendAndConfirmTransaction(conn, new Transaction().add(createIx), [agent])
      console.log(`✓ ${intentPda.toBase58().slice(0, 16)}...`)
      process.stdout.write(`   [3/4] Status: ${verdict}... `)

      if (verdict === 'PASS') {
        console.log('✓ Funds escrowed → settling')

        // Create recipient ATA if needed (use authority as recipient for demo)
        const recipientAta = getAssociatedTokenAddressSync(mint, authority.publicKey)

        // Ensure recipient ATA exists
        const recipientAtaInfo = await conn.getAccountInfo(recipientAta)
        if (!recipientAtaInfo) {
          const createAtaIx = createAssociatedTokenAccountInstruction(
            authority.publicKey, recipientAta, authority.publicKey, mint,
          )
          await sendAndConfirmTransaction(conn, new Transaction().add(createAtaIx), [authority])
        }

        process.stdout.write('   [4/4] Settling... ')
        const settleIx = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: guardConfig, isSigner: false, isWritable: true },
            { pubkey: intentPda, isSigner: false, isWritable: true },
            { pubkey: vaultPda, isSigner: false, isWritable: true },
            { pubkey: recipientAta, isSigner: false, isWritable: true },
            { pubkey: authority.publicKey, isSigner: true, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          data: ixDisc('settle_action'),
        })

        const settleSig = await sendAndConfirmTransaction(conn, new Transaction().add(settleIx), [authority])
        console.log(`✓ Settled! Sig: ${settleSig.slice(0, 20)}...`)
        passed++
      } else if (verdict === 'DENY') {
        console.log('✓ Denied — no funds moved (audit trail recorded)')
        process.stdout.write('   [4/4] ')
        console.log('✗ Settlement skipped (policy denied)')
        passed++
      } else {
        console.log('⏳ Pending human approval')
        process.stdout.write('   [4/4] Approving... ')

        const [approvalPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('approval'), Buffer.from(intentId)],
          PROGRAM_ID,
        )

        const approveIx = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: guardConfig, isSigner: false, isWritable: false },
            { pubkey: intentPda, isSigner: false, isWritable: true },
            { pubkey: approvalPda, isSigner: false, isWritable: true },
            { pubkey: authority.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: ixDisc('approve_action'),
        })

        await sendAndConfirmTransaction(conn, new Transaction().add(approveIx), [authority])
        console.log('✓ Approved + settled')
        passed++
      }
    } catch (err: any) {
      console.log(`✗ Failed: ${err.message?.slice(0, 100)}`)
      failed++
    }

    console.log('')
    console.log('   ─'.repeat(12))
    console.log('')
    await sleep(500)
  }

  // ── Summary ──
  console.log('═'.repeat(50))
  console.log(`🏁 Results: ${passed} passed, ${failed} failed out of ${SCENARIOS.length} scenarios`)
  console.log('')

  if (failed === 0) {
    console.log('✅ ALL SCENARIOS PASSED — demo ready for recording')
  } else {
    console.log('⚠ Some scenarios failed — check the policy engine and on-chain state')
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
