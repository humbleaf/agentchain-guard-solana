# 🤖 MCP Server: Local-Only Status

AgentChain Guard's MCP server is currently configured for **local stdio transport**.

## Status
- **Transport**: `stdio` (Standard Input/Output).
- **Deployment**: Local execution only.
- **Hosted Support**: Categorized as Future Work (requires HTTP/SSE/WebSockets).

## Why Local-Only?
The Model Context Protocol (MCP) `stdio` transport is designed for secure, local communication between an agent host (like Claude Desktop) and a tool provider. Exposing `stdio` over the internet requires a custom bridge or an HTTP/SSE adapter, which is currently in the Phase 2 roadmap.

## How to use in Dev
AI agents can interact with the guard logic locally by running:
```bash
cd apps/mcp-server
pnpm dev
```

For full details on tools and integration, see [MCP_SERVER.md](./MCP_SERVER.md).
