#!/usr/bin/env tsx
/**
 * seed-demo-data.ts — Initialize Guard + Vault + Budget on the live validator.
 *
 * Runs the same instruction sequence as the LiteSVM tests, but against
 * the real validator (localhost or devnet).
 *
 * Usage: tsx scripts/seed-demo-data.ts [--url <rpc_url>]
 */

import { readFileSync } from 'fs'
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
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
} from '@solana/spl-token'
import BN from 'bn.js'

// ── Config ──
const __dirname = dirname(fileURLToPath(import.meta.url))
const RPC_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : process.env.SOLANA_RPC_URL || 'http://localhost:8899'

const ROOT = resolve(__dirname, '..')
const IDL = JSON.parse(readFileSync(resolve(ROOT, 'target/idl/agentchain_guard.json'), 'utf-8'))
const PROGRAM_ID = new PublicKey(IDL.address)

// Load keypairs
function loadKey(name: string): Keypair {
  const path = resolve(ROOT, `.keys/${name}.json`)
  const data = JSON.parse(readFileSync(path, 'utf-8'))
  return Keypair.fromSecretKey(Uint8Array.from(data))
}

// PDA seeds
const GUARD_CONFIG_SEED = Buffer.from('guard_config')
const BUDGET_SEED = Buffer.from('budget')
const VAULT_SEED = Buffer.from('vault')

function findPda(seeds: Buffer[], programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, programId)[0]
}

function ixDisc(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}

async function main() {
  console.log('🛡️  AgentGuard — Seed Demo Data')
  console.log(`   RPC: ${RPC_URL}`)
  console.log(`   Program: ${PROGRAM_ID}`)
  console.log('')

  const conn = new Connection(RPC_URL, 'confirmed')
  const authority = loadKey('authority')
  const agent = loadKey('agent')

  console.log(`  Authority: ${authority.publicKey}`)
  console.log(`  Agent:     ${agent.publicKey}`)

  // Check balances
  const authBal = await conn.getBalance(authority.publicKey)
  const agentBal = await conn.getBalance(agent.publicKey)
  console.log(`  Auth balance: ${authBal / LAMPORTS_PER_SOL} SOL`)
  console.log(`  Agent balance: ${agentBal / LAMPORTS_PER_SOL} SOL`)
  console.log('')

  // ── 1. Create mock USDC mint ──
  console.log('🪙 Creating mock USDC mint...')
  const mintKp = Keypair.generate()
  const mintRent = await conn.getMinimumBalanceForRentExemption(MINT_SIZE)

  const createMintTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: authority.publicKey,
      newAccountPubkey: mintKp.publicKey,
      space: MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mintKp.publicKey, 6, authority.publicKey, null),
  )

  await sendAndConfirmTransaction(conn, createMintTx, [authority, mintKp])
  console.log(`  ✓ Mint: ${mintKp.publicKey}`)

  // ── 2. Create ATAs ──
  console.log('📦 Creating ATAs...')
  const agentAta = getAssociatedTokenAddressSync(mintKp.publicKey, agent.publicKey)

  const ataTx = new Transaction().add(
    createAssociatedTokenAccountInstruction(authority.publicKey, agentAta, agent.publicKey, mintKp.publicKey),
    createMintToInstruction(mintKp.publicKey, agentAta, authority.publicKey, 1_000_000_000), // 1000 USDC
  )
  await sendAndConfirmTransaction(conn, ataTx, [authority])
  console.log(`  ✓ Agent ATA: ${agentAta} (1000 USDC)`)

  // ── 3. Initialize Guard ──
  const guardConfig = findPda([GUARD_CONFIG_SEED], PROGRAM_ID)
  console.log('🔧 Initializing Guard...')
  const guardExists = await conn.getAccountInfo(guardConfig)

  if (guardExists) {
    console.log('  ⚠ GuardConfig already exists — skipping')
  } else {
    const initData = Buffer.concat([
      ixDisc('initialize_guard'),
      new BN(500_000_000).toArrayLike(Buffer, 'le', 8),
    ])
    const initIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: guardConfig, isSigner: false, isWritable: true },
        { pubkey: mintKp.publicKey, isSigner: false, isWritable: false },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: initData,
    })
    await sendAndConfirmTransaction(conn, new Transaction().add(initIx), [authority])
    console.log(`  ✓ GuardConfig: ${guardConfig}`)
  }

  // ── 4. Initialize Vault ──
  const vaultPda = findPda([VAULT_SEED, mintKp.publicKey.toBuffer()], PROGRAM_ID)
  console.log('🔐 Initializing Vault...')
  const vaultExists = await conn.getAccountInfo(vaultPda)

  if (vaultExists) {
    console.log('  ⚠ Vault already exists — skipping')
  } else {
    const vaultIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: guardConfig, isSigner: false, isWritable: false },
        { pubkey: mintKp.publicKey, isSigner: false, isWritable: false },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      data: ixDisc('initialize_vault'),
    })
    await sendAndConfirmTransaction(conn, new Transaction().add(vaultIx), [authority])
    console.log(`  ✓ Vault: ${vaultPda}`)
  }

  // ── 5. Create Budget Account ──
  const scope = Buffer.alloc(32)
  scope[0] = 0x01
  const budgetPda = findPda([BUDGET_SEED, agent.publicKey.toBuffer(), scope], PROGRAM_ID)
  console.log('📊 Creating Budget Account...')

  const budgetExists = await conn.getAccountInfo(budgetPda)
  if (budgetExists) {
    console.log('  ⚠ Budget already exists — skipping')
  } else {
    const budgetData = Buffer.concat([
      ixDisc('create_budget_account'),
      scope,
      new BN(500_000_000).toArrayLike(Buffer, 'le', 8),
    ])
    const budgetIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: guardConfig, isSigner: false, isWritable: false },
        { pubkey: budgetPda, isSigner: false, isWritable: true },
        { pubkey: agent.publicKey, isSigner: false, isWritable: false },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: budgetData,
    })
    await sendAndConfirmTransaction(conn, new Transaction().add(budgetIx), [authority])
    console.log(`  ✓ Budget: ${budgetPda}`)
  }

  // ── 6. Write seed state to .env.seed ──
  const seedEnv = `
# Seed state — generated by seed-demo-data.ts
MOCK_USDC_MINT=${mintKp.publicKey}
GUARD_CONFIG=${guardConfig}
VAULT=${vaultPda}
BUDGET=${budgetPda}
AGENT_ATA=${agentAta}
`.trim()

  const { writeFileSync } = await import('fs')
  writeFileSync(resolve(ROOT, '.env.seed'), seedEnv + '\n')

  console.log('')
  console.log('✅ Seed complete!')
  console.log('═'.repeat(40))
  console.log(seedEnv)
  console.log('')
  console.log('Next: pnpm --filter @agentguard/policy-engine start')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
