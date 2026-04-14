'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Shield,
  CheckCircle,
  ShieldOff,
  Clock,
  Zap,
  Play,
  X,
  ExternalLink,
  Activity,
  Lock,
  FileCheck,
  Circle,
  Loader2,
  BookOpen,
  Globe,
  Copy,
  Download,
  ChevronRight,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

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
  settledAt?: number
  receiptHash?: string
  stepTimings?: number[]
}

interface TraceStep {
  label: string
  status: 'idle' | 'running' | 'done' | 'fail'
  result?: string
  elapsed?: number
}

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const POLICY_ENGINE_URL = process.env.NEXT_PUBLIC_POLICY_ENGINE_URL || 'http://localhost:3010'

const SCENARIOS = [
  {
    name: 'Allowed Payment',
    desc: 'Agent settles 3 USDC for an API call. All five policies pass. Funds escrow then release.',
    amount: 3_000_000,
    actionType: 0,
    expectedVerdict: 'PASS',
    verdictLabel: 'Pass',
    color: 'pass' as const,
    path: 'Escrow → Verify → Release',
    risk: 'Low',
    recipient: 'Allowlisted API',
    settleMode: 'Auto-settle',
  },
  {
    name: 'Blocked Payment',
    desc: 'Agent attempts 150 USDC transfer. Exceeds max-spend policy. Denied at policy gate.',
    amount: 150_000_000,
    actionType: 0,
    expectedVerdict: 'DENY',
    verdictLabel: 'Denied',
    color: 'deny' as const,
    path: 'Blocked at policy gate',
    risk: 'High',
    recipient: 'Non-allowlisted',
    settleMode: 'Denied',
  },
  {
    name: 'Approval Required',
    desc: 'Agent requests 250 USDC payout. Exceeds approval threshold. Requires human sign-off.',
    amount: 250_000_000,
    actionType: 1,
    expectedVerdict: 'PENDING_APPROVAL',
    verdictLabel: 'Requires Approval',
    color: 'pending' as const,
    path: 'Escrow → Human Approval → Release',
    risk: 'Elevated',
    recipient: 'Reward Payout',
    settleMode: 'Human sign-off',
  },
]

type LedgerFilter = 'all' | 'settled' | 'deny' | 'pending'

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

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

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

/* ═══════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const [intents, setIntents] = useState<DemoIntent[]>([])
  const [running, setRunning] = useState(false)
  const [activeScenario, setActiveScenario] = useState<number | null>(null)
  const [ctaPhase, setCtaPhase] = useState<string | null>(null)
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([])
  const [selectedIntent, setSelectedIntent] = useState<DemoIntent | null>(null)
  const [copiedHash, setCopiedHash] = useState(false)
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all')
  const [eventLog, setEventLog] = useState<string[]>([])

  const [boundaryState, setBoundaryState] = useState<{
    active: boolean
    verdict?: string
    amount?: number
    risk?: string
    scenarioColor?: string
    nodes: ('idle' | 'active' | 'done' | 'fail')[]
    timings: (number | null)[]
  }>({ active: false, nodes: ['idle', 'idle', 'idle', 'idle'], timings: [null, null, null, null] })

  const [stats, setStats] = useState({
    totalActions: 0,
    totalSettled: 0,
    totalDenied: 0,
    totalValueGuarded: 0,
  })

  const traceStartRef = useRef(0)

  /* ═══ Add event to live rail ═══ */
  const logEvent = (msg: string) => {
    setEventLog(prev => [msg, ...prev].slice(0, 20))
  }

  /* ═══ Scenario Runner ═══ */
  const runScenario = useCallback(async (idx: number) => {
    if (running) return
    setRunning(true)
    setActiveScenario(idx)
    traceStartRef.current = Date.now()

    const scenario = SCENARIOS[idx]
    const intentId = `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    setBoundaryState({
      active: true,
      amount: scenario.amount,
      risk: scenario.risk,
      scenarioColor: scenario.color,
      nodes: ['active', 'idle', 'idle', 'idle'],
      timings: [null, null, null, null],
    })

    setTraceSteps([
      { label: 'Agent Proposes', status: 'running' },
      { label: 'Policy Evaluates', status: 'idle' },
      { label: 'Receipt Hashed', status: 'idle' },
      { label: 'Onchain Intent', status: 'idle' },
      { label: 'Settlement', status: 'idle' },
    ])

    /* Step 1: Agent proposes */
    setCtaPhase('Evaluating…')
    logEvent(`Agent proposed ${scenario.name} — ${formatUsdc(scenario.amount)} USDC`)
    await sleep(600)
    const e1 = Date.now() - traceStartRef.current
    setTraceSteps(prev => updateTrace(prev, 0, 'done', scenario.name, e1))
    setTraceSteps(prev => updateTrace(prev, 1, 'running'))
    setBoundaryState(prev => ({
      ...prev,
      nodes: ['done', 'active', 'idle', 'idle'],
      timings: [e1, null, null, null],
    }))

    /* Step 2: Policy engine evaluates */
    setCtaPhase('Policy checking…')
    let verdict = scenario.expectedVerdict
    let policies: DemoIntent['policies'] = []
    let receiptHash = ''

    try {
      const res = await fetch(`${POLICY_ENGINE_URL}/v1/intents/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId, agent: 'DemoAgent', requester: 'DemoRequester',
          recipient: 'DemoRecipient', amount: String(scenario.amount),
          actionType: scenario.actionType, mint: 'USDC',
        }),
      })
      const data = await res.json()
      verdict = data.verdict
      policies = data.policyResults || []
      receiptHash = data.receiptHash || ''
    } catch {
      policies = [
        { name: 'max-spend', verdict: scenario.amount > 100_000_000 ? 'DENY' : 'PASS', reason: scenario.amount > 100_000_000 ? 'Exceeds single-action limit' : 'Within threshold' },
        { name: 'allowlist', verdict: 'PASS', reason: 'Recipient approved' },
        { name: 'budget-bucket', verdict: 'PASS', reason: 'Daily cap available' },
        { name: 'duplicate-prevention', verdict: 'PASS', reason: 'Unique intent ID' },
        { name: 'approval-threshold', verdict: scenario.amount >= 200_000_000 ? 'PENDING_APPROVAL' : 'PASS', reason: scenario.amount >= 200_000_000 ? 'Exceeds 100 USDC threshold' : 'Below threshold' },
      ]
      receiptHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    }

    await sleep(800)
    const verdictOk = verdict === 'PASS' || verdict === 'PENDING_APPROVAL'
    const e2 = Date.now() - traceStartRef.current
    logEvent(`Policy engine evaluated ${policies.length} rules → ${verdict}`)
    setTraceSteps(prev => updateTrace(prev, 1, verdictOk ? 'done' : 'fail', `${verdict} · ${policies.length} policies`, e2))
    setTraceSteps(prev => updateTrace(prev, 2, 'running'))
    setBoundaryState(prev => ({
      ...prev,
      verdict,
      nodes: ['done', verdictOk ? 'done' : 'fail', 'active', 'idle'],
      timings: [prev.timings[0], e2, null, null],
    }))

    /* Step 3: Receipt hash */
    setCtaPhase('Hashing receipt…')
    await sleep(400)
    const e3 = Date.now() - traceStartRef.current
    logEvent(`Receipt hash generated — ${shortId(receiptHash)}`)
    setTraceSteps(prev => updateTrace(prev, 2, 'done', shortId(receiptHash), e3))
    setTraceSteps(prev => updateTrace(prev, 3, 'running'))
    setBoundaryState(prev => ({
      ...prev,
      nodes: ['done', prev.nodes[1], 'done', 'active'],
      timings: [prev.timings[0], prev.timings[1], e3, null],
    }))

    /* Step 4: Onchain intent */
    setCtaPhase('Creating intent…')
    await sleep(600)
    const onchainOk = verdict !== 'DENY'
    const e4 = Date.now() - traceStartRef.current
    logEvent(onchainOk ? 'Intent PDA created on-chain' : 'Audit trail recorded (denied)')
    setTraceSteps(prev => updateTrace(prev, 3, onchainOk ? 'done' : 'fail',
      verdict === 'DENY' ? 'Audit trail' : 'PDA created', e4))
    setTraceSteps(prev => updateTrace(prev, 4, 'running'))

    /* Step 5: Final outcome */
    setCtaPhase(verdict === 'PASS' ? 'Settling…' : verdict === 'DENY' ? 'Denied' : 'Awaiting approval…')
    await sleep(500)
    let finalStatus: IntentStatus = 'proposed'
    if (verdict === 'PASS') finalStatus = 'settled'
    else if (verdict === 'DENY') finalStatus = 'deny'
    else if (verdict === 'PENDING_APPROVAL') finalStatus = 'pending'

    const e5 = Date.now() - traceStartRef.current
    logEvent(
      verdict === 'PASS' ? `Settlement released — ${formatUsdc(scenario.amount)} USDC` :
      verdict === 'DENY' ? 'No funds moved — policy denied' :
      'Approval request pending — human review required'
    )
    setTraceSteps(prev => updateTrace(prev, 4,
      verdict === 'DENY' ? 'fail' : 'done',
      verdict === 'PASS' ? `${formatUsdc(scenario.amount)} USDC released` :
        verdict === 'DENY' ? 'No funds moved' :
          'Awaiting approval', e5))

    setBoundaryState(prev => ({
      ...prev,
      nodes: ['done', prev.nodes[1], 'done', verdict === 'DENY' ? 'fail' : verdict === 'PENDING_APPROVAL' ? 'active' : 'done'],
      timings: [prev.timings[0], prev.timings[1], prev.timings[2], e5],
    }))

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
      settledAt: verdict === 'PASS' ? Date.now() : undefined,
      receiptHash,
      stepTimings: [e1, e2, e3, e4, e5],
    }

    setIntents(prev => [newIntent, ...prev])
    setStats(prev => ({
      totalActions: prev.totalActions + 1,
      totalSettled: prev.totalSettled + (verdict === 'PASS' ? 1 : 0),
      totalDenied: prev.totalDenied + (verdict === 'DENY' ? 1 : 0),
      totalValueGuarded: prev.totalValueGuarded + scenario.amount,
    }))

    setRunning(false)
    setActiveScenario(null)
    setCtaPhase(null)
  }, [running])

  /* ═══ Copy hash ═══ */
  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(true)
    setTimeout(() => setCopiedHash(false), 2000)
  }

  /* ═══ Keyboard handler for drawer ═══ */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIntent(null)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  /* ═══ Filtered intents ═══ */
  const filteredIntents = intents.filter(i => {
    if (ledgerFilter === 'all') return true
    if (ledgerFilter === 'settled') return i.status === 'settled'
    if (ledgerFilter === 'deny') return i.status === 'deny'
    if (ledgerFilter === 'pending') return i.status === 'pending'
    return true
  })

  /* ═══ Boundary verdict helpers ═══ */
  const bColor = boundaryState.scenarioColor || 'pass'
  const bVerdictClass = boundaryState.verdict === 'PASS' ? 'settled' : boundaryState.verdict === 'DENY' ? 'deny' : 'pending'

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ══════════════ SECTION 1: Hero Control Surface ══════════════ */}
      <header className="hero-surface">
        <div className="hero-bar">
          <div className="hero-identity">
            <div className="hero-brand">
              <Shield size={20} strokeWidth={2} className="hero-icon" />
              <h1 className="hero-title">AgentChain Guard</h1>
            </div>
            <div className="hero-thesis">Policy-bound settlement for autonomous commerce</div>
            <div className="hero-network">
              <Globe size={10} strokeWidth={2} />
              Solana Devnet
            </div>
          </div>
          <div className="hero-state">
            <div className="state-indicators">
              <div className="state-row">
                <span className="state-label">Policy Engine</span>
                <span className="state-value online mono">
                  <span className="status-dot live" style={{ display: 'inline-block', marginRight: '0.375rem' }} />
                  Online
                </span>
              </div>
              <div className="state-row">
                <span className="state-label">Treasury</span>
                <span className="state-value mono">1,000.00 USDC</span>
              </div>
              <div className="state-row">
                <span className="state-label">Approval Threshold</span>
                <span className="state-value mono">&gt;100.00 USDC</span>
              </div>
              <div className="state-row">
                <span className="state-label">Policies Loaded</span>
                <span className="state-value mono">5</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-label">Guarded Intents</div>
            <div className="hero-stat-value mono">{stats.totalActions}</div>
            <div className="hero-stat-sub">Policy-bound settlements</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-label">Settled</div>
            <div className="hero-stat-value mono">{stats.totalSettled}</div>
            <div className="hero-stat-sub">Value released to recipients</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-label">Denied</div>
            <div className="hero-stat-value mono">{stats.totalDenied}</div>
            <div className="hero-stat-sub">Blocked by policy engine</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-label">Guarded Volume</div>
            <div className="hero-stat-value mono">
              {formatUsdc(stats.totalValueGuarded)}
              <span className="action-amount-unit">USDC</span>
            </div>
            <div className="hero-stat-sub">Total settlement value processed</div>
          </div>
        </div>
      </header>

      {/* ══════════════ SECTION 2: Launch Guarded Actions ══════════════ */}
      <section className="actions-section">
        <div className="section-header">
          <Zap size={16} strokeWidth={2} />
          <h2 className="section-title">Launch Guarded Actions</h2>
          <span className="section-subtitle">Simulate autonomous commerce scenarios</span>
        </div>

        <div className="action-grid">
          {SCENARIOS.map((s, i) => (
            <div
              key={i}
              className={`action-card ${s.color} ${running ? 'disabled' : ''}`}
              onClick={() => runScenario(i)}
            >
              <div className="action-card-top">
                <div className={`action-icon ${s.color}`}>
                  {s.color === 'pass' && <CheckCircle size={18} strokeWidth={2} />}
                  {s.color === 'deny' && <ShieldOff size={18} strokeWidth={2} />}
                  {s.color === 'pending' && <Clock size={18} strokeWidth={2} />}
                </div>
                <span className={`action-verdict-preview ${s.color}`}>{s.verdictLabel}</span>
              </div>
              <div className="action-name">{s.name}</div>
              <div className="action-desc">{s.desc}</div>
              <div className="action-amount">
                {formatUsdc(s.amount)}<span className="action-amount-unit">USDC</span>
              </div>
              <div className="action-meta-grid">
                <div className="action-meta-row">
                  <div className="action-meta-item">
                    <span className="action-meta-label">Recipient</span>
                    <span className="action-meta-value">{s.recipient}</span>
                  </div>
                  <div className="action-meta-item">
                    <span className="action-meta-label">Risk</span>
                    <span className="action-meta-value">{s.risk}</span>
                  </div>
                </div>
                <div className="action-meta-item">
                  <span className="action-meta-label">Path</span>
                  <span className="action-meta-value">{s.settleMode}</span>
                </div>
              </div>
              <button className={`action-cta ${activeScenario === i ? 'running' : ''}`}>
                {activeScenario === i ? (
                  <>
                    <Loader2 size={12} strokeWidth={2} className="spinner" />
                    {ctaPhase}
                  </>
                ) : (
                  <>
                    <Play size={12} strokeWidth={2} />
                    Execute Guarded Action
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ SECTION 2.5: Authority Boundary ══════════════ */}
      <section className="boundary-panel">
        <div className={`boundary-inner ${boundaryState.active ? `active-${bColor}` : ''}`}>
          <div className="section-header">
            <Lock size={16} strokeWidth={2} />
            <h2 className="section-title">Authority Boundary</h2>
            <span className="section-subtitle">Policy-authorized release of value</span>
          </div>

          {!boundaryState.active ? (
            <div className="boundary-idle">
              Run a guarded action to see the authority boundary in effect
            </div>
          ) : (
            <>
              <div className="boundary-flow">
                {/* Node 1: Intent */}
                <div className="boundary-node">
                  <div className={`boundary-node-circle ${boundaryState.nodes[0] !== 'idle' ? 'active' : ''}`}>
                    <Play size={18} strokeWidth={2} />
                  </div>
                  <span className="boundary-node-label">Intent</span>
                  <span className={`boundary-node-timing ${boundaryState.timings[0] !== null ? 'visible' : ''}`}>
                    {boundaryState.timings[0] !== null ? `+${boundaryState.timings[0]}ms` : '—'}
                  </span>
                </div>
                <div className={`boundary-connector ${boundaryState.nodes[0] === 'done' ? 'active' : ''} ${bColor === 'deny' ? 'deny' : bColor === 'pending' ? 'pending' : ''}`} />

                {/* Node 2: Policy */}
                <div className="boundary-node">
                  <div className={`boundary-node-circle ${boundaryState.nodes[1] !== 'idle' ? 'active' : ''} ${boundaryState.nodes[1] === 'fail' ? 'deny' : bColor === 'pending' ? 'pending' : ''}`}>
                    <Shield size={18} strokeWidth={2} />
                  </div>
                  <span className="boundary-node-label">Policy</span>
                  <span className={`boundary-node-timing ${boundaryState.timings[1] !== null ? 'visible' : ''}`}>
                    {boundaryState.timings[1] !== null ? `+${boundaryState.timings[1]}ms` : '—'}
                  </span>
                </div>
                <div className={`boundary-connector ${boundaryState.nodes[1] === 'done' ? 'active' : ''} ${boundaryState.nodes[1] === 'fail' ? 'interrupted' : bColor === 'pending' ? 'pending' : ''}`} />

                {/* Node 3: Receipt */}
                <div className="boundary-node">
                  <div className={`boundary-node-circle ${boundaryState.nodes[2] !== 'idle' ? 'active' : ''} ${boundaryState.nodes[1] === 'fail' ? '' : bColor === 'pending' ? 'pending' : ''}`}>
                    <FileCheck size={18} strokeWidth={2} />
                  </div>
                  <span className="boundary-node-label">Receipt</span>
                  <span className={`boundary-node-timing ${boundaryState.timings[2] !== null ? 'visible' : ''}`}>
                    {boundaryState.timings[2] !== null ? `+${boundaryState.timings[2]}ms` : '—'}
                  </span>
                </div>
                <div className={`boundary-connector ${boundaryState.nodes[2] === 'done' ? 'active' : ''} ${bColor === 'deny' ? 'deny' : bColor === 'pending' ? 'pending' : ''}`} />

                {/* Node 4: Settlement */}
                <div className="boundary-node">
                  <div className={`boundary-node-circle ${boundaryState.nodes[3] !== 'idle' ? 'active' : ''} ${boundaryState.nodes[3] === 'fail' ? 'deny' : bColor === 'pending' && boundaryState.nodes[3] === 'active' ? 'pending dimmed' : ''}`}>
                    {boundaryState.nodes[3] === 'done' ? <CheckCircle size={18} strokeWidth={2} /> :
                     boundaryState.nodes[3] === 'fail' ? <ShieldOff size={18} strokeWidth={2} /> :
                     bColor === 'pending' && boundaryState.nodes[3] === 'active' ? <Clock size={18} strokeWidth={2} /> :
                     <Circle size={18} strokeWidth={2} />}
                  </div>
                  <span className="boundary-node-label">Settlement</span>
                  <span className={`boundary-node-timing ${boundaryState.timings[3] !== null ? 'visible' : ''}`}>
                    {boundaryState.timings[3] !== null ? `+${boundaryState.timings[3]}ms` : '—'}
                  </span>
                </div>
              </div>

              <div className="boundary-summary">
                <div className="boundary-metric">
                  <div className="boundary-metric-label">Requested</div>
                  <div className="boundary-metric-value mono">{formatUsdc(boundaryState.amount || 0)} USDC</div>
                </div>
                <div className="boundary-metric">
                  <div className="boundary-metric-label">Authorized</div>
                  <div className="boundary-metric-value mono" style={{
                    color: boundaryState.verdict === 'DENY' ? 'var(--color-danger)' :
                           boundaryState.verdict === 'PENDING_APPROVAL' ? 'var(--color-amber)' :
                           'var(--emerald-400)'
                  }}>
                    {boundaryState.verdict === 'DENY' ? '0.00' :
                     boundaryState.verdict === 'PENDING_APPROVAL' ? 'Pending' :
                     formatUsdc(boundaryState.amount || 0)} {boundaryState.verdict !== 'PENDING_APPROVAL' ? 'USDC' : ''}
                  </div>
                </div>
                <div className="boundary-metric">
                  <div className="boundary-metric-label">Risk Class</div>
                  <div className="boundary-metric-value mono">{boundaryState.risk}</div>
                </div>
                <div className="boundary-metric">
                  <div className="boundary-metric-label">Verdict</div>
                  <div className="boundary-metric-value">
                    {boundaryState.verdict && (
                      <span className={`verdict-badge animate-phi-flash ${bVerdictClass}`}>
                        {boundaryState.verdict === 'PASS' ? 'Settled' :
                         boundaryState.verdict === 'DENY' ? 'Denied' : 'Requires Approval'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ══════════════ WHY PANEL ══════════════ */}
      <section className="why-panel">
        <div className="why-inner">
          <div className="why-item">
            <Play size={14} strokeWidth={2} />
            <div className="why-text"><strong>Agents propose</strong> value movement autonomously</div>
          </div>
          <div className="why-item">
            <Shield size={14} strokeWidth={2} />
            <div className="why-text"><strong>Policy determines</strong> settlement authority in real-time</div>
          </div>
          <div className="why-item">
            <FileCheck size={14} strokeWidth={2} />
            <div className="why-text"><strong>Every action</strong> produces a reviewable, immutable receipt</div>
          </div>
        </div>
      </section>

      {/* ══════════════ SECTION 3: Intent-to-Settlement Trace ══════════════ */}
      {traceSteps.length > 0 && (
        <section className="trace-section">
          <div className="trace-rail">
            <div className="section-header">
              <Activity size={16} strokeWidth={2} />
              <h2 className="section-title">Intent-to-Settlement Trace</h2>
            </div>
            <div className="trace-timeline">
              {traceSteps.map((step, i) => (
                <div key={i} className="trace-node">
                  <div className={`trace-dot ${step.status}`}>
                    {step.status === 'done' ? <CheckCircle size={14} strokeWidth={2.5} /> :
                     step.status === 'fail' ? <X size={14} strokeWidth={2.5} /> :
                     step.status === 'running' ? <Loader2 size={14} strokeWidth={2.5} className="spinner" /> :
                     <span className="mono" style={{ fontSize: '0.625rem' }}>{i + 1}</span>}
                  </div>
                  <div className="trace-label">{step.label}</div>
                  {step.result && (
                    <div className={`trace-result ${step.status}`}>{step.result}</div>
                  )}
                  {step.elapsed !== undefined && (
                    <div className="trace-elapsed">+{step.elapsed}ms</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ SECTION 5: Action Ledger ══════════════ */}
      <section className="ledger-section">
        <div className="section-header">
          <BookOpen size={16} strokeWidth={2} />
          <h2 className="section-title">Action Ledger</h2>
          <span className="section-subtitle">
            {intents.length} guarded intent{intents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="ledger-filters">
          {(['all', 'settled', 'deny', 'pending'] as LedgerFilter[]).map(f => (
            <button
              key={f}
              className={`ledger-filter-btn ${ledgerFilter === f ? 'active' : ''}`}
              onClick={() => setLedgerFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'settled' ? 'Settled' : f === 'deny' ? 'Denied' : 'Approval'}
            </button>
          ))}
        </div>

        {/* Live event rail */}
        {eventLog.length > 0 && (
          <div className="event-rail">
            <div className="event-rail-dot" />
            <span className="event-rail-text">
              {eventLog[0]}
            </span>
          </div>
        )}

        <div className="ledger-list">
          {filteredIntents.length === 0 && (
            <div className="ledger-empty">
              {intents.length === 0
                ? 'Launch a guarded action above to populate the ledger'
                : 'No intents match the selected filter'}
            </div>
          )}
          {filteredIntents.map((intent, i) => (
            <div
              key={intent.id}
              className="ledger-row"
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => setSelectedIntent(intent)}
            >
              <div className={`ledger-status-icon ${intent.status === 'settled' ? 'settled' : intent.status}`}>
                {intent.status === 'settled' ? <CheckCircle size={14} strokeWidth={2} /> :
                 intent.status === 'deny' ? <ShieldOff size={14} strokeWidth={2} /> :
                 <Clock size={14} strokeWidth={2} />}
              </div>
              <div className="ledger-meta">
                <span className="ledger-id">{shortId(intent.id)}</span>
                <span className="ledger-desc">{intent.actionType}</span>
              </div>
              <span className="ledger-amount">
                {formatUsdc(intent.amount)}
                <span style={{ fontSize: '0.5625rem', opacity: 0.382 }}> USDC</span>
              </span>
              <span className={`verdict-badge ${intent.status === 'settled' ? 'settled' : intent.status}`}>
                {intent.status === 'settled' ? 'Settled' :
                 intent.status === 'deny' ? 'Denied' :
                 intent.status === 'pending' ? 'Requires Approval' : intent.status}
              </span>
              <span className="ledger-time">{timeAgo(intent.timestamp)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════ SECTION 4: Receipt Detail Drawer ══════════════ */}
      {selectedIntent && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedIntent(null)} />
          <div className="drawer-panel">
            <div className="drawer-header">
              <h3 className="drawer-title">Receipt Detail</h3>
              <button className="drawer-close" onClick={() => setSelectedIntent(null)}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Hero block */}
            <div className="drawer-hero">
              <span className={`verdict-badge ${selectedIntent.status === 'settled' ? 'settled' : selectedIntent.status}`} style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
                {selectedIntent.policyVerdict === 'PASS' ? 'Settled' :
                 selectedIntent.policyVerdict === 'DENY' ? 'Denied' : 'Requires Approval'}
              </span>
              <div className="drawer-hero-amount">
                {formatUsdc(selectedIntent.amount)}
                <span className="drawer-hero-unit"> USDC</span>
              </div>
              <div className="drawer-hero-action">{selectedIntent.actionType}</div>
            </div>

            {/* Core fields */}
            <div className="drawer-row">
              <span className="drawer-row-label">Intent ID</span>
              <span className="drawer-row-value">{shortId(selectedIntent.id)}</span>
            </div>
            <div className="drawer-row">
              <span className="drawer-row-label">Agent</span>
              <span className="drawer-row-value">{selectedIntent.agent}</span>
            </div>
            <div className="drawer-row">
              <span className="drawer-row-label">Recipient</span>
              <span className="drawer-row-value">{selectedIntent.recipient}</span>
            </div>

            <hr className="drawer-divider" />

            {/* Policy results */}
            <div className="drawer-section-title">Policy Evaluation ({selectedIntent.policies.length} policies)</div>
            {selectedIntent.policies.map((p, i) => (
              <div key={i} className="policy-row">
                <div className={`policy-icon ${p.verdict === 'PASS' ? 'pass' : 'fail'}`}>
                  {p.verdict === 'PASS' ? <CheckCircle size={10} strokeWidth={2.5} /> : <X size={10} strokeWidth={2.5} />}
                </div>
                <span className="policy-name">{p.name}</span>
                <span className="policy-reason">{p.reason}</span>
              </div>
            ))}

            <hr className="drawer-divider" />

            {/* Receipt hash */}
            {selectedIntent.receiptHash && (
              <>
                <div className="drawer-section-title">Receipt Hash</div>
                <div className="receipt-hash">{selectedIntent.receiptHash}</div>
                <div className="drawer-actions">
                  <button
                    className={`drawer-action-btn ${copiedHash ? 'copied' : ''}`}
                    onClick={() => copyHash(selectedIntent.receiptHash!)}
                  >
                    <Copy size={10} strokeWidth={2} />
                    {copiedHash ? 'Copied' : 'Copy Hash'}
                  </button>
                  <button className="drawer-action-btn">
                    <Download size={10} strokeWidth={2} />
                    Export Receipt
                  </button>
                </div>
                <hr className="drawer-divider" />
              </>
            )}

            {/* Timestamps */}
            <div className="drawer-section-title">Timeline</div>
            <div className="drawer-row">
              <span className="drawer-row-label">Created</span>
              <span className="drawer-row-value">{new Date(selectedIntent.timestamp).toLocaleString()}</span>
            </div>
            {selectedIntent.settledAt && (
              <div className="drawer-row">
                <span className="drawer-row-label">Settled</span>
                <span className="drawer-row-value">{new Date(selectedIntent.settledAt).toLocaleString()}</span>
              </div>
            )}
            {selectedIntent.stepTimings && (
              <div className="drawer-row">
                <span className="drawer-row-label">Total Latency</span>
                <span className="drawer-row-value">{selectedIntent.stepTimings[selectedIntent.stepTimings.length - 1]}ms</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Trace Updater
   ═══════════════════════════════════════════════════════════════════ */

function updateTrace(
  arr: TraceStep[],
  idx: number,
  status: TraceStep['status'],
  result?: string,
  elapsed?: number,
): TraceStep[] {
  const next = [...arr]
  next[idx] = {
    ...next[idx],
    status,
    result: result ?? next[idx].result,
    elapsed: elapsed ?? next[idx].elapsed,
  }
  return next
}
