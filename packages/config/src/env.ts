/**
 * Environment configuration — CWD-independent.
 */

export const ENV = {
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  POLICY_ENGINE_URL: process.env.POLICY_ENGINE_URL || 'http://localhost:3010',
  DASHBOARD_PORT: parseInt(process.env.DASHBOARD_PORT || '3009'),
  POLICY_ENGINE_PORT: parseInt(process.env.POLICY_ENGINE_PORT || '3010'),
} as const
