import { describe, it, expect } from 'vitest'
import { AgentGuardMcpServer } from './index.js'

describe('AgentGuardMcpServer Tools', () => {
  const server = new AgentGuardMcpServer()

  it('guard_check_action: should allow safe transfers', async () => {
    const result = await server.handleCheckAction({
      intentId: 'test-1',
      agent: 'agent-1',
      recipient: '6tgbc3euqJoC7ZYFDvMUR1kP7bFVs6DS2sZdM3B7KKZq', // allowlisted
      amount: 50, // under maxSpend and threshold
      actionType: 'spl-transfer'
    })

    const body = JSON.parse(result.content[0].text)
    expect(body.verdict).toBe('PASS')
    expect(body.receiptHash).toBeDefined()
  })

  it('guard_check_action: should require approval for large transfers', async () => {
    const result = await server.handleCheckAction({
      intentId: 'test-2',
      agent: 'agent-1',
      recipient: '6tgbc3euqJoC7ZYFDvMUR1kP7bFVs6DS2sZdM3B7KKZq',
      amount: 250, // above approval threshold
      actionType: 'spl-transfer'
    })

    const body = JSON.parse(result.content[0].text)
    expect(body.verdict).toBe('PENDING_APPROVAL')
    expect(body.reason).toContain('exceeds approval threshold')
  })

  it('guard_check_action: should deny unlisted recipients', async () => {
    const result = await server.handleCheckAction({
      intentId: 'test-3',
      agent: 'agent-1',
      recipient: 'unknown-recipient',
      amount: 10,
      actionType: 'spl-transfer'
    })

    const body = JSON.parse(result.content[0].text)
    expect(body.verdict).toBe('DENY')
    expect(body.reason).toContain('is NOT on the allowlist')
  })


  it('guard_create_receipt: should generate deterministic hashes', () => {
    const data = { b: 2, a: 1 }
    const result1 = server.handleCreateReceipt({ receiptData: data })
    const result2 = server.handleCreateReceipt({ receiptData: { a: 1, b: 2 } })

    const hash1 = JSON.parse(result1.content[0].text).hash
    const hash2 = JSON.parse(result2.content[0].text).hash
    expect(hash1).toBe(hash2)
  })

  it('guard_explain_decision: should provide clear PASS explanations', () => {
    const result = server.handleExplainDecision({
      verdict: 'PASS',
      results: []
    })
    expect(result.content[0].text).toContain('[SIMULATED]')
    expect(result.content[0].text).toContain('fully authorized')
  })

})
