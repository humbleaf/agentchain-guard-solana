import { Connection, TransactionSignature, TransactionConfirmationStrategy } from '@solana/web3.js'

/**
 * Confirm a transaction with retry logic.
 * Wraps web3.js confirmTransaction with a sensible default timeout.
 */
export async function confirmTx(
  connection: Connection,
  signature: TransactionSignature,
  timeoutMs = 30_000,
): Promise<void> {
  const latestBlockhash = await connection.getLatestBlockhash('confirmed')

  const strategy: TransactionConfirmationStrategy = {
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }

  const result = await connection.confirmTransaction(strategy, 'confirmed')

  if (result.value.err) {
    throw new Error(
      `Transaction ${signature} failed: ${JSON.stringify(result.value.err)}`,
    )
  }
}
