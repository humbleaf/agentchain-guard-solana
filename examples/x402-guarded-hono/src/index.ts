import { Hono } from 'hono'
import { serve } from '@hono/node-server'

/**
 * 🛡️  AgentChain Guard x402-Style Composability Example
 * 
 * "x402 lets agents pay. AgentChain Guard decides whether they should."
 */

const app = new Hono()

// LAW-26: Deployed Cloud Run API URL
const AGENTGUARD_API_URL = 'https://agentguard-api-hnrutilnsq-uc.a.run.app'

console.log('🛡️  AgentChain Guard Guarded Gateway Initialized')
console.log(`🔗 Evaluation Engine: ${AGENTGUARD_API_URL}`)

/**
 * Minimal Guard Client for the Example
 */
class GuardClient {
    async evaluate(intent: {
        intentId: string,
        agent: string,
        requester: string,
        recipient: string,
        amount: string, // Base units as string
        actionType: number,
        mint?: string
    }) {
        const response = await fetch(`${AGENTGUARD_API_URL}/v1/intents/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(intent)
        })

        if (!response.ok) {
            throw new Error(`Policy Engine error: ${response.status} ${response.statusText}`)
        }

        return await response.json()
    }
}

const guard = new GuardClient()

app.post('/api/x402/guarded-pay', async (c) => {
  const body = await c.req.json()
  const { amount, recipient, agentId } = body
  
  console.log(`\n📥 [x402] Payment Proposal: ${amount} USDC for ${recipient}`)
  
  // Convert USDC amount to base units (6 decimals)
  const baseUnits = (Number(amount) * 1_000_000).toString()

  const intent = {
    intentId: `x402-${Date.now()}`,
    agent: agentId || 'F4k96LeHE7jWQXYuAmwfow8dPeuwaFxYMpKRd5mmPVw9',
    requester: agentId || 'F4k96LeHE7jWQXYuAmwfow8dPeuwaFxYMpKRd5mmPVw9',
    recipient: recipient,
    amount: baseUnits,
    actionType: 0, // API_PAYMENT
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
  }

  try {
    console.log('🔍 [GUARD] Evaluating policies via live API...')
    const result = await guard.evaluate(intent)

    if (result.verdict === 'DENY') {
      console.log(`❌ [GUARD] REJECTED: Policy violation detected`)
      return c.json({
        status: 'error',
        code: 403,
        message: 'Payment denied by AgentChain Guard policies.',
        receiptHash: result.receiptHash,
        details: result.policyResults
      }, 403)
    }

    if (result.verdict === 'PENDING_APPROVAL') {
      console.log(`⏳ [GUARD] PENDING: High-value transaction requires human authorization.`)
      return c.json({
        status: 'pending',
        code: 402,
        message: 'High-value transaction requires human authorization.',
        approvalUrl: `https://agentchain-guard-solana-dashboard.vercel.app/intent/${result.id}`,
        receiptHash: result.receiptHash
      }, 402)
    }

    console.log(`✅ [GUARD] PASSED: Determinism Lock created [${result.receiptHash.slice(0, 8)}...]`)
    console.log('🚀 [x402] Initializing on-chain settlement...')

    return c.json({
      status: 'success',
      code: 200,
      message: 'Policy evaluation passed. Settlement authorized.',
      receiptHash: result.receiptHash,
      x402: {
        paymentHeader: result.receiptHash,
        status: 'authorized'
      }
    })
  } catch (err: any) {
    console.error('❌ [ERROR] Gateway failure:', err.message)
    return c.json({ status: 'error', message: err.message }, 500)
  }
})

const port = 3005
serve({ fetch: app.fetch, port })
console.log(`🚀 Guarded API running at http://localhost:${port}`)
