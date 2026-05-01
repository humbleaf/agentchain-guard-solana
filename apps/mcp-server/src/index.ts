import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { PolicyEngine } from "@agentguard/policy-engine/src/engine.js";
import { MaxSpendPolicy } from "@agentguard/policy-engine/src/policies/max-spend.js";
import { AllowlistPolicy } from "@agentguard/policy-engine/src/policies/allowlist.js";
import { ApprovalThresholdPolicy } from "@agentguard/policy-engine/src/policies/approval-threshold.js";
import { hashReceiptHex, canonicalize } from "@agentguard/sdk";

// Initialize the core engine with default policies for the MCP server
const engine = new PolicyEngine([
  new MaxSpendPolicy(500), // Standard limit
  new AllowlistPolicy(["6tgbc3euqJoC7ZYFDvMUR1kP7bFVs6DS2sZdM3B7KKZq"]), // Mock recipient
  new ApprovalThresholdPolicy(100), // Anything above 100 needs approval
]);

class AgentGuardMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "agentguard-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "guard_check_action",
          description: "Verify a proposed Solana/SPL action against AgentChain Guard policies. Returns ALLOW, DENY, or APPROVAL_REQUIRED.",
          inputSchema: {
            type: "object",
            properties: {
              intentId: { type: "string", description: "Unique UUID for the intent" },
              agent: { type: "string", description: "Agent's public key" },
              recipient: { type: "string", description: "Recipient's public key" },
              amount: { type: "number", description: "Amount in decimal (e.g. 10.5)" },
              actionType: { type: "string", description: "e.g. 'spl-transfer' or 'sol-transfer'" },
            },
            required: ["intentId", "agent", "recipient", "amount", "actionType"],
          },
        },
        {
          name: "guard_create_receipt",
          description: "Generate a deterministic SHA-256 receipt for a proposed action.",
          inputSchema: {
            type: "object",
            properties: {
              receiptData: { type: "object", description: "The raw receipt object to hash" },
            },
            required: ["receiptData"],
          },
        },
        {
          name: "guard_explain_decision",
          description: "Explains the policy reasoning behind a guard decision in plain English.",
          inputSchema: {
            type: "object",
            properties: {
              verdict: { type: "string", enum: ["PASS", "DENY", "PENDING_APPROVAL"] },
              results: { type: "array", items: { type: "object" } },
            },
            required: ["verdict", "results"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "guard_check_action":
          return this.handleCheckAction(request.params.arguments);
        case "guard_create_receipt":
          return this.handleCreateReceipt(request.params.arguments);
        case "guard_explain_decision":
          return this.handleExplainDecision(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  public async handleCheckAction(args: any) {
    const input = {
      ...args,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const result = await engine.evaluate(input);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            verdict: result.verdict,
            reason: result.results.find(r => r.verdict !== "PASS")?.reason || "All policies passed.",
            receiptHash: result.receiptHash,
            status: "Security-Hardened Prototype",
            notes: [
              "Simulated Mode: Defaults to simulation for safety during hackathon demos.",
              "No Real Settlement: The MCP server is a logic oracle; it generates receipts but does NOT submit transactions to the Solana network.",
              "Local Stdio Only: Currently supports only local stdio transport for developer safety.",
              "Zero Secrets: The MCP server does not require or store private keys."
            ],
            futureWork: [
              "Hosted MCP: Support for SSE/HTTP transports for cloud-based agent framework integration.",
              "On-Chain Settlement: Optional tool for submitting signed transactions via the Guard API.",
              "ZK Verification: Moving policy engine evaluations to zero-knowledge proofs."
            ]
          }, null, 2),
        },
      ],
    };
  }

  public handleCreateReceipt(args: any) {
    const receipt = args.receiptData;
    const canonical = canonicalize(receipt);
    const hash = hashReceiptHex(receipt);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            canonical,
            hash,
            algorithm: "SHA-256",
          }, null, 2),
        },
      ],
    };
  }

  public handleExplainDecision(args: any) {
    const { verdict, results } = args;
    let explanation = "";

    if (verdict === "PASS") {
      explanation = "[SIMULATED] Action is fully authorized. All guardrails (Spend Limits, Allowlist, Fraud Detection) passed successfully. No real on-chain settlement has occurred.";
    } else if (verdict === "DENY") {
      const failed = results.find((r: any) => r.verdict === "DENY");
      explanation = `[SIMULATED] Action blocked: ${failed?.reason || "Policy violation detected."}`;
    } else if (verdict === "PENDING_APPROVAL") {
      const pending = results.find((r: any) => r.verdict === "PENDING_APPROVAL");
      explanation = `[SIMULATED] Human in the loop required: ${pending?.reason || "Transaction exceeds autonomous threshold."} No funds have been moved.`;
    }


    return {
      content: [
        {
          type: "text",
          text: explanation,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("AgentChain Guard MCP server running on stdio");
  }
}

export { AgentGuardMcpServer };

if (process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'))) {
  const server = new AgentGuardMcpServer();
  server.run().catch(console.error);
}

