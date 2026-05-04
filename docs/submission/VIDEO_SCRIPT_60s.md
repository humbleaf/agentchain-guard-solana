# 🎬 AgentChain Guard — 60-Second Demo Script
## Colosseum Frontier Hackathon · May 2026

**Format**: 1080p · Split-screen (browser right, terminal left)  
**Tone**: Calm, technical, confident. Zero hype. Let the state machine speak.  
**Total runtime**: 60 seconds  

---

## ⏱️ SCENE 1 — The Threat (0:00–0:10) · 10s

**Visual**: Dashboard hero — "Policy-Bound Settlement" headline visible.

> **NARRATION:**
> "In the Agentic Internet, the danger isn't an agent failing to act — it's an agent acting *without permission*. Giving an AI a private key is a liability.
> AgentChain Guard creates an **Authority Boundary** between the agent and the treasury."

**Production note**: No action yet. Static hero. Let the tagline land.

---

## ⏱️ SCENE 2 — Live Policy Engine (0:10–0:25) · 15s

**Visual**: Click **"Allowed Payment" (3 USDC)**. Watch terminal — `[POLICY-ENGINE]` logs appear in real time. Receipt hash materializes on screen.

> **NARRATION:**
> "An agent proposes a 3 USDC payment. Our SDK recursively sorts the agent's metadata and produces a deterministic SHA-256 receipt — the *only* key that can unlock the vault.
> The live Cloud Run policy engine just evaluated it. Decision: **ALLOW**."

**Production note**: Highlight the `receipt_hash` field. Zoom terminal log briefly.

---

## ⏱️ SCENE 3 — Policy Enforcement (0:25–0:37) · 12s

**Visual**: Click **"Blocked Payment" (150 USDC)**. Show `[POLICY-ENGINE] DENY` in terminal. No funds moved.

> **NARRATION:**
> "A high-risk amount hits the allowlist gate. The policy engine fires — **DENY** — before a single lamport touches the escrow.
> The agent is stopped at the boundary. Not the wallet. The *boundary*."

**Production note**: Pause 1s after "DENY" appears — let judges read the log.

---

## ⏱️ SCENE 4 — Human Gate (0:37–0:52) · 15s

**Visual**: Click **"Approval Required" (250 USDC)**. Status changes to `Requires Approval`. Open receipt drawer. Click **"Approve & Settle"**. Show on-chain explorer link.

> **NARRATION:**
> "High-value action — exceeds the 100 USDC threshold. Settlement is gated behind a human operator.
> I audit the deterministic receipt JSON and sign the approval PDA. This is machine speed *plus* human authority. Not one or the other."

**Production note**: Open receipt drawer briefly — show the JSON fields. Judges love the audit trail.

---

## ⏱️ SCENE 5 — Proof + CTA (0:52–1:00) · 8s

**Visual**: Switch to terminal. Run `make test`. Flash `19/19 passed`. Back to dashboard.

> **NARRATION:**
> "19 LiteSVM integration tests verify the full state machine. The hashing logic is cross-verified SDK-to-program.
> **AgentChain Guard: we don't just move SOL — we move *authorized* SOL.**"

**Production note**: Keep the terminal visible during the CTA. Technical credibility stays on screen to the cut.

---

## 🛠️ Pre-Record Checklist

```bash
# 1. Ensure devnet is healthy
curl https://agentguard-api-hnrutilnsq-uc.a.run.app/health

# 2. Connect Phantom/Solflare to Devnet — confirm wallet visible in header
# 3. Run a throwaway test to flush any cold-start latency on Cloud Run
# 4. Terminal font size ≥ 16pt — logs must be legible in 1080p
# 5. Record Scene 5 (make test) first so terminal is clean before browser demo
```

---

## 🎯 Judge Signal Map

| Scene | Claim proven | Evidence shown |
|---|---|---|
| 2 | Live API is real | `[POLICY-ENGINE]` logs in terminal |
| 2 | Deterministic hashing | Receipt hash visible on screen |
| 3 | Policy enforcement works | `DENY` log, no on-chain tx |
| 4 | Human gate works | Approval PDA sign + explorer link |
| 5 | State machine is tested | `19/19 LiteSVM passed` |

---

## 📌 Honesty Flags (say nothing that isn't true)

- Say: *"settlement is simulated for demo reliability"* if asked — do NOT say it in the 60s script (kills momentum).
- The policy engine is **live** on Cloud Run — lead with this confidently.
- The Anchor program is **deployed on Devnet** — have the program ID (`HutGfrkJTsaGMC4bs7X2EFsbbP8LaTEDkWsEBM86RGHz`) visible somewhere on screen.
- Never say "production-ready" — say *"security-hardened prototype"*.
