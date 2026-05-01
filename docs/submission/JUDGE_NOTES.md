# 🧑‍⚖️ Judge Notes: AgentChain Guard

Welcome to the **AgentChain Guard** technical audit. This project was built for the Colosseum Frontier Hackathon to solve the **Trust Gap** in autonomous machine payments.

## 🚀 What to look at first
1. **The Policy Engine** (`packages/policy-engine`): Our off-chain authority that evaluates 5 complex policies before any funds are moved.
2. **Deterministic Hashing** (`packages/sdk/src/canonical.ts`): We implemented recursive key sorting to ensure that agent receipts are cryptographically stable across all environments.
3. **The Anchor Program** (`programs/agentchain-guard`): A state-machine that holds funds in escrow until the "Authority Boundary" (Policy + Human) is satisfied.

## 💎 What makes this non-trivial
- **Deep Determinism**: Most web3 projects use shallow JSON sorting. We went deep to prevent "Hash Drift" in nested metadata, which is critical for machine-readable receipts.
- **x402 Alignment**: The system is designed to respond to 402 (Payment Required) status codes, allowing agents to negotiate their own resource access.
- **Dual-Gate Security**: Funds are only released if *both* the Policy Engine (fast) and the Human Operator (if threshold met) give the green light.

## 🏗️ On-Chain vs. Off-Chain
- **On-Chain**: Fund escrow (Vault), Action Intents, Approval PDAs, and final Settlement release.
- **Off-Chain**: Policy evaluation, receipt signing, and dashboard orchestration.

## ⚖️ Determinism
- **Verified**: We have a dedicated test (`tests/litesvm/index.test.ts` → Test 8) that verifies the SDK's hashing parity against a pre-computed fixture.

## 🚧 Intentionally Scoped Out
- **Mainnet Deployment**: Per Captain's Directive [CD-002], this is devnet-only.
- **ZK Proofs**: While receipt hashes are on-chain, full ZK verification of the policy evaluation is slated for v2.
- **Multi-sig Approval**: Currently supports single-operator approval for the hackathon demo.

## 🛠️ How to Verify
Run the full suite in one command:
```bash
make test-all
```
This runs the Anchor tests, SDK parity tests, and LiteSVM integration tests.
