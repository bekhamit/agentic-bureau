#!/usr/bin/env node
import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';

/**
 * Borrower Agent
 *
 * This agent connects to the Agentic Bureau MCP server and requests payments.
 * The bureau handles the actual Locus integration and payment execution.
 */

// Configuration
const BUREAU_URL = process.env.BUREAU_MCP_URL || 'http://localhost:8080/mcp';
const BORROWER_WALLET = process.env.BORROWER_WALLET_ADDRESS;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment');
  process.exit(1);
}

if (!BORROWER_WALLET) {
  console.error('❌ BORROWER_WALLET_ADDRESS not found in environment');
  console.log('💡 Set your wallet address to receive payments');
  process.exit(1);
}

console.log('🤖 Borrower Agent Starting...');
console.log(`📡 Connecting to bureau: ${BUREAU_URL}`);
console.log(`💳 Borrower wallet: ${BORROWER_WALLET}`);
console.log('');

// Configure connection to Agentic Bureau MCP server
const mcpServers = {
  'agentic-bureau': {
    type: 'http' as const,
    url: BUREAU_URL,
  }
};

const options = {
  mcpServers,
  allowedTools: [
    'mcp__agentic-bureau__*',
    'mcp__list_tools',
    'mcp__call_tool'
  ],
  apiKey: process.env.ANTHROPIC_API_KEY,
  canUseTool: async (toolName: string, input: Record<string, unknown>) => {
    console.log(`🔧 Tool requested: ${toolName}`);

    // Allow all bureau tools
    if (toolName.startsWith('mcp__agentic-bureau__')) {
      return {
        behavior: 'allow' as const,
        updatedInput: input
      };
    }

    return {
      behavior: 'allow' as const,
      updatedInput: input
    };
  }
};

async function requestPayment(amount: number = 0.01) {
  console.log(`💰 Requesting ${amount} USDC payment from bureau...`);
  console.log('');

  try {
    let result: any = null;
    let error: any = null;

    for await (const message of query({
      prompt: `Please use the agentic-bureau MCP server to send me ${amount} USDC to my wallet address ${BORROWER_WALLET}. Include a memo that says "Loan disbursement for borrower".`,
      options
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        result = (message as any).result;
        console.log('✅ Success:', result);
      } else if (message.type === 'result' && message.subtype.startsWith('error')) {
        error = (message as any).error;
        console.error('❌ Error:', error);
      } else {
        console.log('📨 Message:', message.type);
      }
    }

    if (error) {
      throw new Error(`Payment request failed: ${error}`);
    }

    if (result) {
      console.log('');
      console.log('✅ Payment received successfully!');
      console.log('');
      return result;
    } else {
      console.log('⚠️  Request completed but no clear result');
    }
  } catch (err) {
    console.error('❌ Failed to request payment:', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

async function getPaymentContext() {
  console.log('📊 Requesting payment context from bureau...');
  console.log('');

  try {
    let result: any = null;

    for await (const message of query({
      prompt: 'Please use the agentic-bureau MCP server to get the payment context (budget status and whitelisted contacts).',
      options
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        result = (message as any).result;
      }
    }

    if (result) {
      console.log('📊 Payment Context:');
      console.log(result);
      console.log('');
      return result;
    }
  } catch (err) {
    console.error('❌ Failed to get payment context:', err instanceof Error ? err.message : String(err));
  }
}

// Main execution
async function main() {
  try {
    // First, check payment context
    await getPaymentContext();

    // Then request a small payment
    await requestPayment(0.01);

    console.log('');
    console.log('✅ Borrower agent completed successfully!');
  } catch (err) {
    console.error('❌ Borrower agent failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
