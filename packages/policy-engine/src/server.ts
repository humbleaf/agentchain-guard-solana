import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { PolicyEngine } from './engine.js'
import { MaxSpendPolicy } from './policies/max-spend.js'
import { AllowlistPolicy } from './policies/allowlist.js'
import { BudgetBucketPolicy } from './policies/budget-bucket.js'
import { DuplicatePreventionPolicy } from './policies/duplicate-prevention.js'
import { ApprovalThresholdPolicy } from './policies/approval-threshold.js'
import type { PolicyInput } from './policies/types.js'

const PORT = parseInt(process.env.PORT || '3010')

// ── Initialize Engine ──
const engine = new PolicyEngine()

// Register all 5 policies with demo-friendly defaults
engine.addPolicy(new MaxSpendPolicy(100_000_000))         // 100 USDC
engine.addPolicy(new AllowlistPolicy([
  // Will be populated by seed-demo-data.ts
  // Empty = open mode for initial development
]))
engine.addPolicy(new BudgetBucketPolicy(500_000_000))     // 500 USDC daily
engine.addPolicy(new DuplicatePreventionPolicy())
engine.addPolicy(new ApprovalThresholdPolicy(200_000_000)) // 200 USDC

// ── HTTP Server ──
const app = new Hono()

app.use('*', cors())
app.use('*', logger())

// ═══ Health ═══
app.get('/health', (c) => c.json({
  status: 'ok',
  service: 'agentguard-policy-engine',
  policies: engine.getPolicyNames(),
  timestamp: new Date().toISOString(),
}))

// ═══ POST /v1/intents/evaluate ═══
// Main endpoint: evaluate an action request against all policies.
app.post('/v1/intents/evaluate', async (c) => {
  try {
    const body = await c.req.json()

    const input: PolicyInput = {
      intentId: body.intentId,
      agent: body.agent,
      requester: body.requester,
      recipient: body.recipient,
      amount: Number(body.amount),
      actionType: Number(body.actionType),
      mint: body.mint,
      timestamp: Math.floor(Date.now() / 1000),
    }

    const result = await engine.evaluate(input)

    return c.json({
      verdict: result.verdict,
      receiptHash: result.receiptHash,
      receipt: result.receipt,
      policyResults: result.results,
    })
  } catch (err) {
    console.error('Policy evaluation error:', err)
    return c.json({ error: 'Policy evaluation failed', details: String(err) }, 500)
  }
})

// ═══ POST /v1/x402/verify ═══
// x402 facilitator endpoint: evaluate a payment intent for policy compliance.
// This acts as a policy oracle for API providers.
app.post('/v1/x402/verify', async (c) => {
  try {
    const body = await c.req.json()

    const input: PolicyInput = {
      intentId: body.paymentHeader || `x402-${Date.now()}`,
      agent: body.agentPubkey,
      requester: body.agentPubkey,
      recipient: body.recipientPubkey,
      amount: Number(body.amount),
      actionType: 0, // API_PAYMENT
      mint: body.mint || 'unknown',
      timestamp: Math.floor(Date.now() / 1000),
    }

    const result = await engine.evaluate(input)

    return c.json({
      verdict: result.verdict,
      receipt: result.receipt,
      receiptHash: result.receiptHash,
      policyResults: result.results,
      serviceEndpoint: body.serviceEndpoint,
    })
  } catch (err) {
    console.error('x402 verify error:', err)
    return c.json({ error: 'x402 verification failed', details: String(err) }, 500)
  }
})

// ═══ GET /v1/policies ═══
// List registered policies (for dashboard/playground).
app.get('/v1/policies', (c) => {
  return c.json({
    policies: engine.getPolicyNames(),
  })
})

// ═══ Start ═══
console.log(`🛡️  AgentGuard Policy Engine listening on :${PORT}`)
console.log(`   Policies: ${engine.getPolicyNames().join(', ')}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
