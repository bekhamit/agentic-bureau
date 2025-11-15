#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { sendPayment, getPaymentContext } from './locus-client.js';

/**
 * Locus Bank MCP Server
 *
 * This MCP server provides banking/payment functionality using Locus.
 * It exposes tools for sending USDC payments to wallet addresses.
 */

// Create MCP server instance
const server = new Server(
  {
    name: "locus-bank-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: "send_payment",
    description: "Send USDC payment to a wallet address via Locus. Sends real USDC on Base blockchain.",
    inputSchema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "The destination wallet address (must start with 0x)",
        },
        amount: {
          type: "number",
          description: "Amount of USDC to send (must be greater than 0)",
        },
        memo: {
          type: "string",
          description: "Optional payment memo/description",
        },
      },
      required: ["wallet_address", "amount"],
    },
  },
  {
    name: "get_payment_context",
    description: "Get payment context including budget status and whitelisted contacts from Locus",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// Handle tool listing requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Ensure args exists
    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "send_payment": {
        const walletAddress = args.wallet_address as string;
        const amount = args.amount as number;
        const memo = (args.memo as string) || "Payment via Locus Bank MCP";

        // Validate inputs
        if (!walletAddress || typeof walletAddress !== 'string') {
          throw new Error("wallet_address is required and must be a string");
        }
        if (!walletAddress.startsWith('0x')) {
          throw new Error("wallet_address must start with 0x");
        }
        if (!amount || typeof amount !== 'number' || amount <= 0) {
          throw new Error("amount is required and must be a number greater than 0");
        }

        // Send payment using Locus client
        const result = await sendPayment(walletAddress, amount, memo);

        return {
          content: [
            {
              type: "text",
              text: `Payment sent successfully!\n\nDetails:\n- Amount: ${amount} USDC\n- To: ${walletAddress}\n- Memo: ${memo}\n\nResult: ${result}`,
            },
          ],
        };
      }

      case "get_payment_context": {
        const context = await getPaymentContext();

        return {
          content: [
            {
              type: "text",
              text: `Payment Context:\n\n${JSON.stringify(context, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error("Locus Bank MCP Server started");
  console.error("Ready to accept payment requests");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
