# 🛡️ x402-Guarded Hono Example

This example demonstrates how to integrate **AgentChain Guard** as a policy-bound authorization layer for **x402-style** agent payments.

> “x402 lets agents pay. AgentChain Guard decides whether they should.”

## The "Guard-Before-Payment" Pattern

Most agent payment systems (like x402) focus on the *how* (the rails for moving money). AgentChain Guard focuses on the *why* (the authority to move money).

In this example, a Hono server acts as a payment gateway that intercepts an agent's payment proposal, validates it against a live policy engine, and only authorizes settlement if it passes modular guardrails.

### What it proves:
1. **Ecosystem Composability**: AgentChain Guard can sit in front of any payment protocol (x402, Blinks, etc.).
2. **Deterministic Security**: Every authorized payment is linked to an immutable receipt hash.
3. **Human-in-the-Loop**: High-value x402 intents are automatically routed for human approval.

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run the guarded gateway
npm run dev
```

## Testing Scenarios

Use `curl` to test the guarded endpoint:

### 1. Allowed Payment (3 USDC)
```bash
curl -X POST http://localhost:3005/api/x402/guarded-pay \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 3,
    "recipient": "9U4kLUUwP8hAJ9tgxE25P4TwDs2mV7kjjeggyKoWfbV4",
    "agentId": "agent-001",
    "metadata": { "service": "llm-inference" }
  }'
```
**Expected Outcome**: `200 OK` - Policy PASS. Settlement authorized.

### 2. High-Value Payment (250 USDC)
```bash
curl -X POST http://localhost:3005/api/x402/guarded-pay \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250,
    "recipient": "9U4kLUUwP8hAJ9tgxE25P4TwDs2mV7kjjeggyKoWfbV4",
    "agentId": "agent-001"
  }'
```
**Expected Outcome**: `402 Payment Required` - Approval required. Redirects to dashboard.

### 3. Blocked Merchant
```bash
curl -X POST http://localhost:3005/api/x402/guarded-pay \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "recipient": "EVIL_MERCHANT_ADDRESS",
    "agentId": "agent-001"
  }'
```
**Expected Outcome**: `403 Forbidden` - Denied by Allowlist policy.

---

## Technical Disclaimer
This is an **x402-style prototype**. It demonstrates the *integration pattern* and does not perform real on-chain settlement or require a mainnet facilitator. It uses the live AgentChain Guard Policy API on Google Cloud Run.
