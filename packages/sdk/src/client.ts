import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import { PROGRAM_ID } from './constants.js'

// IDL will be imported at build time from the Anchor-generated JSON.
// For now, re-export from a known path.
import type { AgentchainGuard } from '../../target/types/agentchain_guard.js'

export interface GuardClientConfig {
  connection: Connection
  wallet: Wallet | Keypair
  programId?: PublicKey
}

/**
 * Create an Anchor program client for AgentChain Guard.
 */
export function createGuardProgram(config: GuardClientConfig): Program<AgentchainGuard> {
  const { connection, wallet } = config
  const programId = config.programId ?? PROGRAM_ID

  const anchorWallet = wallet instanceof Keypair
    ? new Wallet(wallet)
    : wallet

  const provider = new AnchorProvider(connection, anchorWallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })

  // Load IDL from the build artifacts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const idl = require('../../target/idl/agentchain_guard.json')

  return new Program<AgentchainGuard>(idl, provider)
}
