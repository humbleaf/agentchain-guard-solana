# 🛡️ AgentChain Guard: Policy-Bound Autonomous Commerce

> **Submission for Colosseum Frontier Hackathon · May 2026**

## The Problem
As AI agents move from "chatbots" to "economic actors," the risk of unconstrained value movement grows. Conventional wallets are designed for humans; they lack the precision to enforce per-action budgets, merchant allowlists, or multi-stage approval thresholds for machine-originated transactions.

## The Solution
**AgentChain Guard** is a policy and settlement control layer built on Solana. It acts as an "Authority Boundary" between the AI agent and the treasury, ensuring every settlement is pre-authorized by an immutable policy engine.

### Key Innovations
1.  **Deterministic Receipt Verification**: Every agent action produces a deep-deterministic JSON receipt. The SHA-256 hash of this receipt is recorded on-chain, creating a permanent, audit-ready trail of the *intent* behind the payment.
2.  **x402 Agent Economy**: Implements the HTTP 402 (Payment Required) standard for agents. When an agent hits a resource gate, the Guard evaluates the request against 5 pre-loaded policies:
    - `max-spend`: Limits single-action exposure.
    - `allowlist`: Restricts recipients to verified vendors.
    - `approval-threshold`: Automatically triggers human-in-the-loop for high-value actions.
    - `budget-bucket`: Enforces daily/lifetime caps per agent.
    - `duplicate-prevention`: Prevents replay attacks on receipts.
3.  **Solana-Bound Guardrails**: Leverages Solana's high-throughput and low latency to make high-frequency machine payments economically viable without sacrificing security.

## What is actually built?
1.  **Anchor Program** (`agentchain_guard`): A secure vault-escrow system on Solana Devnet.
2.  **Deterministic SDK**: A TypeScript library for recursive key-sorting and SHA-256 receipt generation.
3.  **Policy Engine**: A Hono-based microservice that evaluates 5 modular policies for every intent.
4.  **Premium Dashboard**: A Next.js 15 command center with Solana wallet integration and real-time intent tracing.

## Demo Flow
1.  **Connect Wallet**: Link your Solana Devnet wallet.
2.  **Allowed Payment**: Trigger a 3 USDC payment. Watch the Policy Engine verify it, funds escrow on-chain, and settle immediately.
3.  **Approval Gate**: Trigger a 250 USDC payout. See the "Requires Approval" status. Review the deterministic receipt JSON in the drawer and click "Approve & Settle" to release funds.
4.  **Deterministic Proof**: Copy the receipt hash and compare it to the trace log; we guarantee hash stability across the stack.

## Security Model
AgentChain Guard implements an **Authority Boundary**. Funds are never released without a valid policy signature. High-value transactions are gated by the authorized `GuardConfig` authority. See [SECURITY_MODEL.md](./SECURITY_MODEL.md) for details.

## Limitations / Future Work
- **ZK Verification**: Moving the Policy Engine signature to a ZK-proof of evaluation.
- **Multisig**: Integrating with Squads for decentralized operator approval.
- **Advanced Budgets**: Dynamic budget replenishment based on agent performance.

## How to Run Locally
```bash
# Clone and install
git clone https://github.com/humbleaf-cartel/agentchain-mono
cd agentchain-guard-solana
pnpm install

# Start development services
make dev
```

## How to Test
```bash
# Run the full integration suite (Anchor + LiteSVM + SDK)
make test-all
```

---
Built with 💚 by **Humbleaf Cartel**

