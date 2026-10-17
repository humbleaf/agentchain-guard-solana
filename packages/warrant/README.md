# @agentguard/warrant

Warrant is the signed permission AgentGuard will require before a payment.

AgentGuard stays the Solana program and the dashboard. This package does not rename it.

A permit says who may be paid, how much, from which vault, on which network, and which key must have signed. The Solana program is still the lock. Tonight that lock is being changed so the operator funds the vault and a missing or altered permit cannot pay.

Run the freeze check from this folder:

```bash
pnpm test
```

The rules for the signature are in `docs/warrant/FREEZE.md`.
