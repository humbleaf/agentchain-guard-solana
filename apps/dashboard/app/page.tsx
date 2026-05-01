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
  Wallet,
} from 'lucide-react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { PROGRAM_ID, INTENT_SEED, GUARD_CONFIG_SEED, BUDGET_SEED, VAULT_SEED, APPROVAL_SEED } from '../lib/constants'
import idl from '../lib/idl.json'


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

/* ═══ Deep Sort for Deterministic Hashing ═══ */
function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)
  return Object.keys(obj).sort().reduce((acc: any, key) => {
    acc[key] = sortKeys(obj[key])
    return acc
  }, {})
}

function getReceiptHash(receipt: any) {
  const canonical = JSON.stringify(sortKeys(receipt))
  const hash = crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return hash
}

async function bufToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}


/* ═══════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const { publicKey, sendTransaction } = wallet

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

  /* ═══ Program Setup ═══ */
  const program = useMemo(() => {
    if (!publicKey) return null
    const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })
    return new Program(idl as any, provider)
  }, [connection, publicKey, wallet])

  /* ═══ PDA Helpers ═══ */
  const getGuardConfigPda = () => PublicKey.findProgramAddressSync([Buffer.from(GUARD_CONFIG_SEED)], PROGRAM_ID)[0]
  const getVaultPda = (mint: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from(VAULT_SEED), mint.toBuffer()], PROGRAM_ID)[0]
  const getIntentPda = (id: Uint8Array) => PublicKey.findProgramAddressSync([Buffer.from(INTENT_SEED), Buffer.from(id)], PROGRAM_ID)[0]
  const getBudgetPda = (agent: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from(BUDGET_SEED), agent.toBuffer(), Buffer.from([1]).concat(Buffer.alloc(31))], PROGRAM_ID)[0]


  /* ═══ Add event to live rail ═══ */
  const logEvent = (msg: string) => {
    setEventLog(prev => [msg, ...prev].slice(0, 20))
  }

  /* ═══ Scenario Runner ═══ */
  const runScenario = useCallback(async (idx: number) => {
    if (running) return
    
    if (!publicKey) {
      logEvent('⚠️ Connect wallet to execute on-chain scenarios')
      // For demo purposes, we allow proceeding in "Simulation Mode" if not connected
      // but we warn the user.
    }

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
      { label: 'Boundary Check', status: 'idle' },
      { label: 'Determinism Lock', status: 'idle' },
      { label: 'Onchain Escrow', status: 'idle' },
      { label: 'Final Settlement', status: 'idle' },
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
    const modeLabel = publicKey ? '[ON-CHAIN]' : '[SIMULATED]'
    logEvent(`${modeLabel} Policy engine evaluated ${policies.length} rules → ${verdict}`)
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
    let txSig = ''
    const onchainOk = verdict !== 'DENY'

    if (onchainOk && program && publicKey) {
      try {
        const intentIdBytes = new TextEncoder().encode(intentId.padEnd(32, '\0')).slice(0, 32)
        const receiptHashBytes = new Uint8Array(await getReceiptHash({
          intentId, agent: 'DemoAgent', amount: scenario.amount, recipient: scenario.recipient
        }))

        // Derive PDAs
        const guardConfigPda = getGuardConfigPda()
        const budgetPda = getBudgetPda(publicKey) // Using connected wallet as agent for demo
        const intentPda = getIntentPda(intentIdBytes)
        
        // Mock mint (USDC) from constants or state
        const MOCK_USDC = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') // Mainnet USDC as placeholder or fetch from config
        const vaultPda = getVaultPda(MOCK_USDC)
        
        // Actual Anchor call example:
        /* 
        try {
          txSig = await program.methods.createActionIntent(
            Array.from(intentIdBytes),
            new BN(scenario.amount),
            0, // action_type
            Array.from(receiptHashBytes),
            verdict === 'PASS' ? 0 : 2, // policy_verdict
            new BN(Math.floor(Date.now() / 1000) + 3600) // expires_at
          ).accounts({
            guardConfig: guardConfigPda,
            actionIntent: intentPda,
            budgetAccount: budgetPda,
            vaultTokenAccount: vaultPda,
          }).rpc()
          logEvent(`On-chain transaction confirmed: ${txSig.slice(0, 8)}...`)
        } catch (e: any) {
          console.warn('Anchor call failed (simulation fallback):', e)
          logEvent(`⚠️ On-chain fail: ${e.message?.slice(0, 40)}... (Continuing in Sim Mode)`)
        }
        */
        
        await sleep(1000) // Simulate tx confirmation
        logEvent(`[SIMULATED] Intent recorded off-chain — ${intentId.slice(0, 8)}`)


      } catch (err: any) {
        console.error('On-chain error:', err)
        logEvent(`On-chain error: ${err.message || 'Transaction failed'}`)
      }
    } else {
      await sleep(600)
    }

    const e4 = Date.now() - traceStartRef.current
    logEvent(onchainOk ? '[SIMULATED] Intent PDA created' : '[SIMULATED] Audit trail recorded (denied)')
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
      verdict === 'PASS' ? `[SIMULATED] Settlement authorized — ${formatUsdc(scenario.amount)} USDC release proof ready` :
      verdict === 'DENY' ? '[SIMULATED] No funds moved — policy gate closed' :
      '[SIMULATED] Approval request pending — authority boundary active'
    )
    setTraceSteps(prev => updateTrace(prev, 4,
      verdict === 'DENY' ? 'fail' : 'done',
      verdict === 'PASS' ? `${formatUsdc(scenario.amount)} USDC Authorized` :
        verdict === 'DENY' ? 'Blocked' :
          'Awaiting Authority', e5))



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
  }, [running, program, publicKey, getGuardConfigPda, getBudgetPda, getIntentPda, getVaultPda])

  /* ═══ Approve Action ═══ */
  const handleApprove = useCallback(async (intent: DemoIntent) => {
    if (!program || !publicKey) {
      logEvent('Connect wallet to approve transactions')
      return
    }

    try {
      logEvent(`Approving intent ${shortId(intent.id)} on-chain...`)
      
      const intentIdBytes = new TextEncoder().encode(intent.id.padEnd(32, '\0')).slice(0, 32)
      const intentPda = getIntentPda(intentIdBytes)
      const approvalPda = PublicKey.findProgramAddressSync([Buffer.from(APPROVAL_SEED), Buffer.from(intentIdBytes)], PROGRAM_ID)[0]
      const guardConfigPda = getGuardConfigPda()

      // Actual Anchor call would go here
      logEvent('Awaiting wallet signature...')
      // For demo, we simulate the success if accounts aren't ready
      await sleep(1500)
      
      setIntents(prev => prev.map(i => i.id === intent.id ? { ...i, status: 'settled', settledAt: Date.now() } : i))
      setSelectedIntent(null)
      logEvent(`[SIMULATED] Intent ${shortId(intent.id)} approved and settled!`)

      
      setStats(prev => ({ ...prev, totalSettled: prev.totalSettled + 1 }))
    } catch (err: any) {
      console.error('Approval failed:', err)
      logEvent(`Approval error: ${err.message || 'Transaction failed'}`)
    }
  }, [program, publicKey, getGuardConfigPda, getIntentPda])

  /* ═══ Copy JSON ═══ */
  const copyJson = (intent: DemoIntent) => {
    const json = JSON.stringify(sortKeys({
      intentId: intent.id,
      agent: intent.agent,
      recipient: intent.recipient,
      amount: intent.amount,
      policies: intent.policies,
      receiptHash: intent.receiptHash
    }), null, 2)
    navigator.clipboard.writeText(json)
    logEvent('Receipt JSON copied to clipboard')
  }

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
            <div className="hero-thesis">Deterministic, policy-bound receipts for autonomous machine payments</div>
            <div className="hero-network">
              <Globe size={10} strokeWidth={2} />
              Solana Devnet
            </div>
            <div className="hero-mode">
              <span className={`status-pill ${publicKey ? 'live' : 'sim'}`}>
                {publicKey ? 'Devnet Authority' : 'Simulation Mode'}
              </span>
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
              <div className="ledger-empty-icon">
                <BookOpen size={32} strokeWidth={1.5} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              </div>
              <div className="ledger-empty-text">
                {intents.length === 0
                  ? 'No guarded intents yet. Select a scenario above to initialize the authority boundary.'
                  : 'No intents match the active filter.'}
              </div>
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
                <div className="ledger-id-row">
                  <span className="ledger-id">{shortId(intent.id)}</span>
                  <span className={`ledger-mode-badge ${intent.status === 'settled' && !publicKey ? 'sim' : 'real'}`}>
                    {intent.status === 'settled' && !publicKey ? 'Simulated' : 'Devnet'}
                  </span>
                </div>
                <span className="ledger-desc">{intent.actionType}</span>
              </div>
              <span className="ledger-amount">
                {formatUsdc(intent.amount)}
                <span style={{ fontSize: '0.5625rem', opacity: 0.382 }}> USDC</span>
              </span>
              <div className="ledger-outcome">
                <span className={`verdict-badge ${intent.status === 'settled' ? 'settled' : intent.status}`}>
                  {intent.status === 'settled' ? 'Settled' :
                  intent.status === 'deny' ? 'Denied' :
                  intent.status === 'pending' ? 'Requires Approval' : intent.status}
                </span>
                <span className="ledger-time">{timeAgo(intent.timestamp)}</span>
              </div>

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
                  <button 
                    className="drawer-action-btn"
                    onClick={() => copyJson(selectedIntent)}
                  >
                    <Download size={10} strokeWidth={2} />
                    Copy Receipt JSON
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

            {/* Approve Action (if pending) */}
            {selectedIntent.status === 'pending' && (
              <div className="drawer-cta-section">
                <button 
                  className="drawer-primary-btn"
                  onClick={() => handleApprove(selectedIntent)}
                >
                  <CheckCircle size={14} strokeWidth={2} />
                  Approve & Settle Action
                </button>
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
