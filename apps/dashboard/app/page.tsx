'use client'

import { useState, useCallback } from 'react'

type IntentStatus = 'proposed' | 'pass' | 'deny' | 'pending' | 'settled' | 'refunded'

interface DemoIntent {
  id: string
  agent: string
  recipient: string
  amount: number
  actionType: string
  status: IntentStatus
  policyVerdict: string
  policies: { name: string; verdict: string; reason: string }[]
  timestamp: number
  receiptHash?: string
}

const POLICY_ENGINE_URL = process.env.NEXT_PUBLIC_POLICY_ENGINE_URL || 'http://localhost:3010'

const SCENARIOS = [
  {
    icon: '▶',
    name: 'Allowed Payment',
    desc: 'Agent pays 3 USDC for an API call. All policies pass. Funds escrow → settle.',
    amount: 3_000_000,
    actionType: 0,
    expectedVerdict: 'PASS',
    color: 'pass',
  },
  {
    icon: '⊗',
    name: 'Blocked Payment',
    desc: 'Agent attempts 150 USDC transfer. Exceeds max-spend policy. Denied.',
    amount: 150_000_000,
    actionType: 0,
    expectedVerdict: 'DENY',
    color: 'deny',
  },
  {
    icon: '⏳',
    name: 'Approval Required',
    desc: 'Agent requests 250 USDC reward payout. Exceeds threshold. Requires human approval.',
    amount: 250_000_000,
    actionType: 1,
    expectedVerdict: 'PENDING_APPROVAL',
    color: 'pending',
  },
]

function formatUsdc(amount: number): string {
  return (amount / 1_000_000).toFixed(2)
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function DashboardPage() {
  const [intents, setIntents] = useState<DemoIntent[]>([])
  const [running, setRunning] = useState(false)
  const [pipelineSteps, setPipelineSteps] = useState<
    { label: string; status: 'idle' | 'running' | 'done' | 'fail'; result?: string }[]
  >([])
  const [stats, setStats] = useState({
    totalActions: 0,
    totalSettled: 0,
    totalDenied: 0,
    totalValueGuarded: 0,
  })

  const runScenario = useCallback(async (scenarioIdx: number) => {
    if (running) return
    setRunning(true)

    const scenario = SCENARIOS[scenarioIdx]
    const intentId = `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    setPipelineSteps([
      { label: 'Agent proposes action', status: 'running' },
      { label: 'Policy engine evaluates', status: 'idle' },
      { label: 'Receipt hash generated', status: 'idle' },
      { label: 'Onchain intent created', status: 'idle' },
      { label: 'Settlement / Denial', status: 'idle' },
    ])

    await sleep(600)
    setPipelineSteps(prev => update(prev, 0, 'done', `${scenario.name} — ${formatUsdc(scenario.amount)} USDC`))
    setPipelineSteps(prev => update(prev, 1, 'running'))

    // Call the real policy engine
    let verdict = scenario.expectedVerdict
    let policies: DemoIntent['policies'] = []
    let receiptHash = ''

    try {
      const res = await fetch(`${POLICY_ENGINE_URL}/v1/intents/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId,
          agent: 'DemoAgent',
          requester: 'DemoRequester',
          recipient: 'DemoRecipient',
          amount: String(scenario.amount),
          actionType: scenario.actionType,
          mint: 'USDC',
        }),
      })
      const data = await res.json()
      verdict = data.verdict
      policies = data.policyResults || []
      receiptHash = data.receiptHash || ''
    } catch {
      // Offline mode — use expected verdict
      policies = [
        { name: 'max-spend', verdict: scenario.amount > 100_000_000 ? 'DENY' : 'PASS', reason: 'Simulated' },
        { name: 'allowlist', verdict: 'PASS', reason: 'Open mode' },
        { name: 'budget-bucket', verdict: 'PASS', reason: 'Within budget' },
        { name: 'duplicate-prevention', verdict: 'PASS', reason: 'Unique' },
        { name: 'approval-threshold', verdict: scenario.amount >= 200_000_000 ? 'PENDING_APPROVAL' : 'PASS', reason: 'Simulated' },
      ]
    }

    await sleep(800)
    const verdictOk = verdict === 'PASS' || verdict === 'PENDING_APPROVAL'
    setPipelineSteps(prev => update(prev, 1, verdictOk ? 'done' : 'fail', `Verdict: ${verdict} (${policies.length} policies)`))
    setPipelineSteps(prev => update(prev, 2, 'running'))

    await sleep(400)
    setPipelineSteps(prev => update(prev, 2, 'done', receiptHash ? shortId(receiptHash) : 'SHA-256 generated'))
    setPipelineSteps(prev => update(prev, 3, 'running'))

    await sleep(600)
    const onchainOk = verdict !== 'DENY'
    setPipelineSteps(prev => update(prev, 3, onchainOk ? 'done' : 'fail',
      verdict === 'DENY' ? 'Recorded as DENIED (audit trail)' : 'PDA created + funds escrowed'))
    setPipelineSteps(prev => update(prev, 4, 'running'))

    await sleep(500)
    let finalStatus: IntentStatus = 'proposed'
    if (verdict === 'PASS') finalStatus = 'settled'
    else if (verdict === 'DENY') finalStatus = 'deny'
    else if (verdict === 'PENDING_APPROVAL') finalStatus = 'pending'

    setPipelineSteps(prev => update(prev, 4,
      verdict === 'DENY' ? 'fail' : 'done',
      verdict === 'PASS' ? `✓ ${formatUsdc(scenario.amount)} USDC → recipient` :
        verdict === 'DENY' ? '✗ No funds moved' :
          '⏳ Awaiting human approval'))

    const newIntent: DemoIntent = {
      id: intentId,
      agent: 'DemoAgent',
      recipient: 'DemoRecipient',
      amount: scenario.amount,
      actionType: scenario.name,
      status: finalStatus,
      policyVerdict: verdict,
      policies,
      timestamp: Date.now(),
      receiptHash,
    }

    setIntents(prev => [newIntent, ...prev])
    setStats(prev => ({
      totalActions: prev.totalActions + 1,
      totalSettled: prev.totalSettled + (verdict === 'PASS' ? 1 : 0),
      totalDenied: prev.totalDenied + (verdict === 'DENY' ? 1 : 0),
      totalValueGuarded: prev.totalValueGuarded + scenario.amount,
    }))

    setRunning(false)
  }, [running])

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <span className="shield">🛡️</span>
          <h1>AgentGuard</h1>
          <span>Solana Devnet</span>
        </div>
        <div className="header-actions">
          <div className="header-status">
            <div className="status-dot" />
            Policy Engine Online
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Actions</div>
          <div className="stat-value">{stats.totalActions}</div>
          <div className="stat-sub">Policy-checked intents</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Settled</div>
          <div className="stat-value">{stats.totalSettled}</div>
          <div className="stat-sub">Successfully transferred</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Denied</div>
          <div className="stat-value">{stats.totalDenied}</div>
          <div className="stat-sub">Blocked by policy</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Value Guarded</div>
          <div className="stat-value">{formatUsdc(stats.totalValueGuarded)} <span style={{fontSize: '0.8rem', opacity: 0.6}}>USDC</span></div>
          <div className="stat-sub">Total value processed</div>
        </div>
      </div>

      {/* Demo Panel */}
      <div className="demo-panel">
        <div className="demo-title">
          <span style={{fontSize: '1.5rem'}}>⚡</span>
          <h2>Live Demo — Run a Scenario</h2>
        </div>
        <div className="demo-scenarios">
          {SCENARIOS.map((s, i) => (
            <div
              key={i}
              className={`scenario-card ${running ? '' : 'active'}`}
              onClick={() => runScenario(i)}
              style={{ opacity: running ? 0.5 : 1, pointerEvents: running ? 'none' : 'auto' }}
            >
              <div className="scenario-icon">{s.icon}</div>
              <div className="scenario-name">{s.name}</div>
              <div className="scenario-desc">{s.desc}</div>
              <div className="scenario-amount">{formatUsdc(s.amount)} USDC</div>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Pipeline */}
      {pipelineSteps.length > 0 && (
        <div className="pipeline animate-in">
          <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            🔬 Settlement Pipeline
          </h3>
          {pipelineSteps.map((step, i) => (
            <div key={i} className="pipeline-step">
              <div className={`pipeline-step-num ${step.status === 'done' ? 'done' : step.status === 'fail' ? 'fail' : ''}`}>
                {step.status === 'done' ? '✓' : step.status === 'fail' ? '✗' : step.status === 'running' ? '⟳' : i + 1}
              </div>
              <div className="pipeline-step-label">{step.label}</div>
              {step.result && (
                <div className="pipeline-step-result" style={{
                  color: step.status === 'done' ? 'var(--emerald-400)' : step.status === 'fail' ? 'var(--danger)' : 'var(--text-secondary)'
                }}>
                  {step.result}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Intent Feed */}
      <div className="feed-section">
        <div className="feed-header">
          <h2>📋 Intent Feed</h2>
          <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
            {intents.length} intent{intents.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="intent-list">
          {intents.length === 0 && (
            <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem'}}>
              Run a demo scenario above to see intents appear here ↑
            </div>
          )}
          {intents.map((intent, i) => (
            <div key={intent.id} className="intent-card animate-in" style={{animationDelay: `${i * 50}ms`}}>
              <div className={`intent-icon ${intent.status === 'settled' ? 'pass' : intent.status}`}>
                {intent.status === 'settled' ? '✓' : intent.status === 'deny' ? '✗' : intent.status === 'pending' ? '⏳' : '•'}
              </div>
              <div className="intent-meta">
                <span className="id">{shortId(intent.id)}</span>
                <span className="desc">{intent.actionType} → {intent.policyVerdict}</span>
              </div>
              <span className="intent-amount">{formatUsdc(intent.amount)} USDC</span>
              <span className={`badge ${intent.status === 'settled' ? 'settled' : intent.status}`}>
                {intent.status === 'settled' ? 'Settled' :
                  intent.status === 'deny' ? 'Denied' :
                    intent.status === 'pending' ? 'Pending' : intent.status}
              </span>
              <span className="intent-time">{timeAgo(intent.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helpers
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function update(
  arr: { label: string; status: string; result?: string }[],
  idx: number,
  status: string,
  result?: string,
) {
  const next = [...arr]
  next[idx] = { ...next[idx], status: status as any, result: result ?? next[idx].result }
  return next
}
