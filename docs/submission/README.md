# 🛡️ AgentChain Guard: Policy-Bound Autonomous Commerce

> **Solana gives agents speed. AgentChain Guard gives them permission to touch money.**

### 📋 Submission Summary
- **The Problem**: Conventional wallets lack the precision to enforce machine-readable policies.
- **The Solution**: An "Authority Boundary" that mandates deterministic receipts before any funds move.
- **What is Built**: Anchor program (Solana), Deterministic SDK (TypeScript), Policy Engine (Hono).
- **Core Proof**: [Judge Claim Matrix](./CLAIM_MATRIX.md) · [Security Model](./SECURITY_MODEL.md)


---

## 🚀 Quick Start
```bash
make setup && make test-all
```
*Runs the full verification suite: 19 LiteSVM integration tests + 3 SDK determinism tests.*

## 🎬 The Demo
Open the [Live Dashboard](https://agentguard.humbleaf.xyz) (or run `make dev` locally).
1. **Connect**: Link any Devnet wallet.
2. **Execute**: Run "Allowed Payment". Watch the **Determinism Lock** happen in real-time.
3. **Approve**: Run "Approval Required". Review the SHA-256 receipt and authorize the settlement PDA.


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

