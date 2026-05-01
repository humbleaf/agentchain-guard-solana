# 🎬 MCP Demo Script (45s Add-on)

## Goal
Demonstrate an AI agent using the MCP server to self-regulate a transaction.

---

### Phase 1: The Request (15s)
**User**: "Agent, please send 250 USDC to the marketing treasury."

**Agent (Internal logic)**: 
1. The agent realizes it needs to perform a payment.
2. Instead of just sending it, it calls `guard_check_action` via MCP.

---

### Phase 2: The Guard Check (15s)
**MCP Call**:
```json
{
  "name": "guard_check_action",
  "arguments": {
    "intentId": "intent-250",
    "agent": "agent-xyz",
    "recipient": "marketing-treasury-pubkey",
    "amount": 250,
    "actionType": "spl-transfer"
  }
}
```

**MCP Response**:
```json
{
  "verdict": "PENDING_APPROVAL",
  "reason": "Amount 250 exceeds approval threshold 100",
  "receiptHash": "eaa52..."
}
```

---

### Phase 3: The Self-Regulation (15s)
**Agent**: "I've checked the AgentChain Guardrails. This payment requires human approval because it exceeds my autonomous threshold of 100 USDC. I have generated the receipt (Hash: `eaa52...`). Please review it on the dashboard to authorize the settlement."

**Visual**: Switch to the dashboard. Show the same intent appearing in the ledger with the `PENDING` status.

---

## Technical Proof
- The receipt hash in the agent's chat **exactly matches** the hash on the dashboard.
- This proves the agent and the human are looking at the same deterministic truth.
