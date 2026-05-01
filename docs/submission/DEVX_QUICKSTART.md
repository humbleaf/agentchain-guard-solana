# 🛠️ Developer Experience (DevX) Quickstart

AgentChain Guard is built for developers. This guide shows how to integrate the Guard into your agentic stack in minutes.

## 1. The SDK (30 Seconds)
Integrate deterministic hashing and policy evaluation into your TypeScript agent.

```typescript
import { GuardClient } from '@agentguard/sdk'

const guard = new GuardClient({ baseUrl: 'https://agentguard-api-hnrutilnsq-uc.a.run.app' })

// Propose an action
const result = await guard.evaluate({
  amount: 5,
  recipient: '...',
  agentId: 'agent-007'
})

if (result.decision === 'DENY') throw new Error(result.reason)
```

## 2. Ecosystem Composability: x402 Example
We've provided a complete example in `examples/x402-guarded-hono` showing how to protect agent payments.

**The Pattern**: `Agent -> Guard Gateway -> Policy Pass -> x402 Facilitator -> Settlement`

- **Location**: `agentchain-guard-solana/examples/x402-guarded-hono/`
- **Thesis**: "x402 lets agents pay. AgentChain Guard decides whether they should."

## 3. The MCP Server (AI-Native)
If your agent uses the Model Context Protocol (MCP), you can connect it directly to the Guard.

- **Docs**: [docs/submission/MCP_SERVER.md](./MCP_SERVER.md)
- **Tool**: `propose_guarded_action`

## 4. Local Verification (The LiteSVM Suite)
Run exhaustive integration tests in seconds without Devnet SOL.

```bash
cd agentchain-guard-solana
make setup
make test
```

## 5. Live Dashboard
Monitor your agents and approve high-value intents at:
[https://agentchain-guard-solana-dashboard.vercel.app](https://agentchain-guard-solana-dashboard.vercel.app)
