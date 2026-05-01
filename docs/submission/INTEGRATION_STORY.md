# 🛠️ The 10-Minute Integration Story

How a third-party Solana builder integrates the **Authority Boundary** today.

## 1. The Setup (2 Mins)
Builder installs the SDK and initializes the `GuardClient` with their agent's wallet and the Guard program ID.
```bash
pnpm add @agentguard/sdk
```

## 2. Proposing an Action (3 Mins)
Instead of a raw SPL transfer, the agent calls `proposeAction`.
- **Off-chain**: The SDK canonicalizes the action metadata (Amount, Recipient, Intent ID) using deep-recursive sorting.
- **Verification**: The Policy Engine evaluates the 5-layer ruleset and signs a SHA-256 receipt hash.
- **On-chain**: The agent creates an `ActionIntent` PDA on Solana, escrowing the funds into the Guard vault.

## 3. The Verdict (2 Mins)
- **If PASS**: The agent receives a settlement-ready receipt.
- **If PENDING**: The action enters the human-in-the-loop queue. The operator approves via the Dashboard, signing the `ApproveAction` instruction.
- **If DENY**: The funds remain in the requester's control; the intent is marked as failed on-chain for the audit trail.

## 4. Settlement (3 Mins)
Once authorized, the agent (or a crank) calls `settleAction`. The Anchor program verifies the receipt hash against the stored intent and releases funds to the recipient.

---

## 📈 Current Integration Maturity
- **Score**: 8/10
- **What's Missing**: A single copy-pasteable `examples/minimal-integration.ts` file in the root.
- **Action**: Create this example file on Day 3 of the Win Plan to achieve 10/10 "Developer Readiness."
