# 🤖 AgentChain Guard MCP Server

> **“The dashboard is for humans. The MCP server is for agents.”**

## Overview
AgentChain Guard includes a tightly scoped **Model Context Protocol (MCP)** server. This allows AI agents to interact directly with the permission boundary to verify actions, generate deterministic receipts, and understand policy decisions without leaving their execution context.

By exposing AgentChain Guard as an MCP toolset, we enable agents to be **self-regulating**—checking their own proposed actions against on-chain policies before they even attempt a transaction.

## Why it matters
1. **Agent Self-Regulation**: Agents can use `guard_check_action` to preemptively discover if a transaction will be blocked or require human approval.
2. **Deterministic Trust**: Agents can generate and verify the same SHA-256 receipts used by the human dashboard, ensuring a unified audit trail.
3. **Composability**: Integrates natively with any agent framework that supports MCP (e.g. Claude Desktop, Wayfinder, ELIZA).

## Available Tools

### 1. `guard_check_action`
Accepts a proposed Solana/SPL action and evaluates it against the policy engine.
- **Inputs**: `intentId`, `agent`, `recipient`, `amount`, `actionType`.
- **Outputs**: `verdict` (ALLOW/DENY/APPROVAL_REQUIRED), `reason`, `receiptHash`, `mode` (SIMULATED/DEVNET).

### 2. `guard_create_receipt`
Generates a deterministic SHA-256 receipt for any given data object.
- **Inputs**: `receiptData` (Object).
- **Outputs**: `canonical` (JSON string), `hash` (SHA-256), `algorithm`.

### 3. `guard_explain_decision`
Provides a human-readable explanation for a guard decision.
- **Inputs**: `verdict`, `results` (Policy array).
- **Outputs**: Plain English explanation (e.g. "Transaction exceeds autonomous threshold").

## How to Run

### Development Mode
```bash
cd apps/mcp-server
pnpm install
pnpm dev
```

### Production Build
```bash
pnpm --filter @agentguard/mcp-server build
pnpm --filter @agentguard/mcp-server start
```

## Integration with Agent Frameworks
To add AgentChain Guard to an agentic workflow, configure the MCP server in your `mcp_config.json`:

```json
{
  "mcpServers": {
    "agentguard": {
      "command": "node",
      "args": ["/path/to/agentchain-guard-solana/apps/mcp-server/dist/index.js"]
    }
  }
}
```

## Status: Security-Hardened Prototype
- **Simulated Mode**: Defaults to simulation for safety during hackathon demos.
- **No Real Settlement**: The MCP server is a logic oracle; it generates receipts but does NOT submit transactions to the Solana network.
- **Local Stdio Only**: Currently supports only local `stdio` transport for developer safety.
- **Zero Secrets**: The MCP server does not require or store private keys.

## Future Work
- **Hosted MCP**: Support for SSE/HTTP transports for cloud-based agent framework integration.
- **On-Chain Settlement**: Optional tool for submitting signed transactions via the Guard API.
- **ZK Verification**: Moving policy engine evaluations to zero-knowledge proofs.
