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

## Replay Protection
- Every intent includes a unique `intent_id`.
- The `duplicate-prevention` policy caches processed `intent_id`s to prevent replay attacks.
- The `INTENT_SEED` ensures each intent has a unique PDA on-chain.
