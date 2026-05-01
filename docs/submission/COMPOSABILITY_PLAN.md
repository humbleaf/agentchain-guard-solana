# 🧩 Composability Plan: AgentChain Guard

AgentChain Guard is designed as a "Security Primitive" that composes with existing Solana infrastructure.

## 🔗 Solana Primitives
- **SPL Tokens**: Native support for any SPL token (USDC, SOL-wraps) in the vault-escrow.
- **PDAs**: Uses Program Derived Addresses for Intents, Vaults, and Budgets, ensuring deterministic state.
- **Anchor**: Built using the industry-standard Anchor framework for maximum developer readability.

## 🚀 Potential Integrations (Phase 2)
- **Squads (Multisig)**: The `authority_signer` can be a Squads multisig, allowing DAOs to vote on high-level guard configurations.
- **Solana Pay / Blinks**: Merchants can generate "Payment Requests" that agents automatically evaluate and settle via the Guard.
- **TipLink / Binks**: Integration for simplified "Claim-able" agent payments gated by policy.
- **Oracle (Pyth/Switchboard)**: Using oracles to adjust budget caps based on real-time asset volatility.

## 🛡️ Ecosystem Composability: The "Guard-Before-Payment" Pattern
We have implemented `examples/x402-guarded-hono` to demonstrate how AgentChain Guard composes with emerging agent-payment standards like x402.

**Thesis**: x402 lets agents pay; AgentChain Guard decides whether they should.

- **Example**: `examples/x402-guarded-hono/`: A Hono-based gateway that intercepts x402-style payment intents and validates them against the Policy Engine before authorizing settlement.

## 📦 Developer Friendliness
- **Typed SDK**: Full TypeScript support with Zod schemas for receipts.
- **Hono Gateway**: Standard HTTP REST API for easy integration into any language (Python, Rust, etc.).
- **MCP Server**: Official Model Context Protocol server for direct AI agent integration.
- **LiteSVM Localhost**: Reviewers can run the entire suite in seconds with zero network overhead.

