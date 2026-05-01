# 🛡️ Security Model: AgentChain Guard

## Threat Model
**Goal**: Prevent unauthorized AI agent value movement while maintaining auditability.

### Trust Assumptions
1. **Policy Engine**: The operator trusts the off-chain Policy Engine to sign valid receipts.
2. **Oracle/Operator**: The human operator is the final authority for transactions exceeding the threshold.

## Security Enforcements

### On-Chain (Anchor Program)
- **Escrow Isolation**: Funds for a proposed action are moved to a specific `ActionIntent` PDA. They cannot be accessed by other intents.
- **Immutable Hashes**: The receipt hash is stored on-chain at intent creation. It cannot be modified.
- **Settlement Verification**: The `settle_action` instruction requires the `action_intent` to be in an `APPROVED_READY` or `PASSED` state.

### Off-Chain (SDK / Policy Engine)
- **Deep Canonicalization**: Prevents "Hash Drift" where minor JSON formatting changes would invalidate a receipt.
- **5-Layer Policy Scan**: Every intent must pass all 5 policies (Max Spend, Allowlist, Budget Bucket, Duplicate Prevention, Approval Threshold).

### Dashboard (Human-in-the-Loop)
- **Policy Transparency**: All policy reasons are displayed to the user before approval.
- **Wallet-Bound**: Only the authorized `GuardConfig` authority can sign the `approve_action` transaction.

## Known Limitations & Hardening Steps
- **Current**: Single-authority approval.
- **Future**: Integration with Squads/Multisig for decentralized operator approval.
- **Future**: ZK-verified policy evaluations to remove trust in the off-chain Policy Engine.
- **Future**: Realloc logic for expanding budget buckets.
## Demo Boundary: Simulation & Wallet Proof
The Dashboard includes two demonstration modes designed for reliability during hackathon reviews:
- **Simulation Mode**: A zero-setup path where the dashboard simulates the on-chain transition to allow the user to see the "Authority Boundary" logic without requiring Devnet SOL.
- **Wallet Proof Mode**: When a wallet is connected, the app uses **Message Signing** to cryptographically link the user's pubkey to the intent proposal. This provides proof of identity without the fragility of Devnet transaction submission.
- **What is REAL**: The Deterministic Hashing logic, recursive key-sorting, and 5-layer Policy Evaluation. These run live in the browser and on the Policy Engine.
- **What is SIMULATED**: The actual broadcast of transactions to Solana Devnet is gated behind the `NEXT_PUBLIC_ENABLE_DEVNET_TX` flag. This ensures the demo is "judge-safe" by default.

## Replay Protection
- Every intent includes a unique `intent_id`.
- The `duplicate-prevention` policy caches processed `intent_id`s to prevent replay attacks.
- The `INTENT_SEED` ensures each intent has a unique PDA on-chain.
