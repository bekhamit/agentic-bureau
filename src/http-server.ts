#!/usr/bin/env node
import express from 'express';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { sendPayment, getPaymentContext } from './locus-client.js';

/**
 * Agentic Bureau MCP Server (HTTP/Streamable Transport)
 *
 * Uses StreamableHTTPServerTransport for reliable multi-client MCP connections.
 * This is the SDK-recommended approach for HTTP-based MCP servers.
 */

const PORT = process.env.PORT || 8080;

// Create Express app
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agentic-bureau-mcp' });
});

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

// Create MCP server instance (shared across all sessions)
const server = new Server(
  {
    name: "agentic-bureau-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
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
        const memo = (args.memo as string) || "Payment via Agentic Bureau";

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

        console.log(`Processing payment: ${amount} USDC to ${walletAddress}`);

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
        console.log('Fetching payment context');
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
    console.error(`Error executing tool ${name}:`, errorMessage);
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

// Single MCP endpoint - handles all MCP protocol operations
app.post('/mcp', async (req, res) => {
  console.log('New MCP request received');

  // Create transport for this request
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  // Clean up on response close
  res.on('close', () => {
    transport.close();
  });

  try {
    // Connect transport to server and handle the request
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agentic Bureau MCP Server running on port ${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Ready to accept connections from MCP clients');
  console.log('Using StreamableHTTPServerTransport (SDK recommended)');
});
