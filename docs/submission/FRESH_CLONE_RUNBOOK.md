# 🛠️ Fresh Clone Runbook: AgentChain Guard

This guide is for judges and technical reviewers starting from a clean machine.

## 📋 Prerequisites
- **Node.js**: v20 or higher
- **pnpm**: v9 or higher
- **Rust**: stable toolchain
- **Solana CLI**: v1.18 or higher
- **Anchor CLI**: v0.31.1

## 🚀 Quick Start (Simulation Mode)
If you do not want to set up a full Solana Devnet environment, you can run the dashboard in **Simulation Mode**.

```bash
# 1. Install dependencies
pnpm install

# 2. Run SDK tests (Deterministic Hashing Proof)
cd packages/sdk && pnpm test

# 3. Start Dashboard
cd apps/dashboard && pnpm dev
```
Open [http://localhost:3000](http://localhost:3000). The dashboard will use simulated on-chain responses while still running real deterministic hashing and policy evaluation.

## 🛰️ Full Devnet Setup (Real Transactions)
To run real on-chain transactions on Solana Devnet:

```bash
# 1. Full Environment Setup
# (Installs Rust/Solana/Anchor if missing, generates keys, airdrops SOL)
make setup

# 2. Build & Deploy
# (Builds Anchor program, deploys to Devnet, updates SDK constants)
make deploy

# 3. Initialize Guard
# (Creates the on-chain GuardConfig account)
make init-guard

# 4. Start All Services
make dev
```

## 🧪 Verification Commands

| Command | What it tests | Expected Output |
|---|---|---|
| `make test-sdk` | Deterministic Hashing | `3 passed` (Vitest) |
| `make test` | LiteSVM Integration | `19 passed, 0 failed` |
| `make test-all` | Full Suite | Success across all layers |

## ⚠️ Common Failure Modes
- **Airdrop Rate Limit**: If `make setup` fails on airdrop, wait 60s and run `make fund`.
- **Program ID Mismatch**: If you manually change `declare_id!`, run `make deploy` to sync the SDK.
- **Port Conflicts**: Dashboard uses `3009`, Policy Engine uses `3010`.

## 🔄 Simulation vs. Real
- **Real Path**: Requires a connected Solana wallet (Phantom/Solflare) on Devnet and the `make deploy` step. Labels in the log will say `[ON-CHAIN]`.
- **Simulation Path**: Used if no wallet is connected or if a transaction is rejected. Labels in the log will say `[SIMULATED]`.
- **Policy Engine**: Always real. Even in simulation mode, the 5-layer policy evaluation and SHA-256 receipt generation are live.
