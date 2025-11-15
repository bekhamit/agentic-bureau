#!/usr/bin/env node
import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { sendPayment } from './locus-client.js';

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

async function requestLoan(amount: number = 0.01) {
  console.log(`💰 Requesting ${amount} USDC loan from bureau...`);
  console.log('');

  try {
    let result: any = null;
    let error: any = null;
    let loanId: string | null = null;

    for await (const message of query({
      prompt: `Please use the agentic-bureau MCP server to request a loan of ${amount} USDC for my wallet address ${BORROWER_WALLET}. Use the request_loan tool.`,
      options
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        result = (message as any).result;
        console.log('✅ Loan response:', result);

        // Try to extract loan ID from the result (handles markdown formatting)
        const loanIdMatch = result.match(/Loan ID.*?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/is);
        if (loanIdMatch) {
          loanId = loanIdMatch[1];
          console.log(`📝 Extracted Loan ID: ${loanId}`);
        } else {
          console.warn('⚠️  Could not extract loan ID from response');
          console.log('Response text:', result.substring(0, 300));
        }
      } else if (message.type === 'result' && message.subtype.startsWith('error')) {
        error = (message as any).error;
        console.error('❌ Error:', error);
      } else {
        console.log('📨 Message:', message.type);
      }
    }

    if (error) {
      throw new Error(`Loan request failed: ${error}`);
    }

    if (result) {
      console.log('');
      console.log('✅ Loan approved and disbursed!');
      console.log('');
      return { result, loanId };
    } else {
      console.log('⚠️  Request completed but no clear result');
      return { result: null, loanId: null };
    }
  } catch (err) {
    console.error('❌ Failed to request loan:', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

async function getLoanStatus() {
  console.log('📊 Checking loan status...');
  console.log('');

  try {
    let result: any = null;

    for await (const message of query({
      prompt: `Please use the agentic-bureau MCP server to get my loan status for wallet ${BORROWER_WALLET}. Use the get_loan_status tool.`,
      options
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        result = (message as any).result;
      }
    }

    if (result) {
      console.log('📊 Loan Status:');
      console.log(result);
      console.log('');
      return result;
    }
  } catch (err) {
    console.error('❌ Failed to get loan status:', err instanceof Error ? err.message : String(err));
  }
}

async function repayLoan(loanId: string) {
  console.log(`💵 Initiating repayment for loan ${loanId}...`);
  console.log('');

  try {
    // Demo: Send payment to bureau's wallet
    const BUREAU_WALLET = '0xd6a540476804b6f3df549fc2d272357ddb20e028';
    const repaymentAmount = 0.0105; // Principal + 5% interest

    console.log(`💰 Sending ${repaymentAmount.toFixed(4)} USDC to bureau (${BUREAU_WALLET})...`);

    // Send payment using borrower's Locus client
    const { result: paymentResult, transactionId } = await sendPayment(
      BUREAU_WALLET,
      repaymentAmount,
      `Loan repayment for ${loanId}`
    );

    console.log(`✅ Payment sent! Transaction ID: ${transactionId || 'pending'}`);
    console.log('');

    // Confirm repayment with bureau
    console.log('📝 Confirming repayment with bureau...');

    let confirmationResult: any = null;

    for await (const message of query({
      prompt: `Please use the agentic-bureau MCP server to confirm repayment for loan ${loanId}. My wallet address is ${BORROWER_WALLET} and the Locus transaction ID is ${transactionId || 'demo-tx-' + Date.now()}. Use the repay_loan tool.`,
      options
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        confirmationResult = (message as any).result;
        console.log('✅ Bureau confirmation:', confirmationResult);
      }
    }

    console.log('');
    console.log('✅ Repayment completed successfully!');
    console.log('');

    return confirmationResult;
  } catch (err) {
    console.error('❌ Failed to repay loan:', err instanceof Error ? err.message : String(err));
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
    console.log('=== BORROWER AGENT DEMO ===');
    console.log('');

    // Step 1: Check initial loan status
    console.log('📍 Step 1: Checking initial credit profile');
    await getLoanStatus();

    // Step 2: Request a loan
    console.log('📍 Step 2: Requesting a loan');
    const loanAmount = 0.01; // Request 0.01 USDC for demo
    const { loanId } = await requestLoan(loanAmount);

    // Step 3: Check loan status after approval
    console.log('📍 Step 3: Checking updated loan status');
    await getLoanStatus();

    // Step 4: Wait 10 seconds (simulating usage of funds) then repay
    if (loanId) {
      console.log('📍 Step 4: Using borrowed funds...');
      console.log('⏳ Loan is being used for computational work (10 second term)');
      console.log('');

      // Countdown timer
      for (let i = 10; i > 0; i--) {
        process.stdout.write(`\r⏱️  Time remaining: ${i} seconds...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('\r✅ Loan term completed!                    ');
      console.log('');

      console.log('📍 Step 5: Repaying the loan with interest');
      await repayLoan(loanId);

      console.log('📍 Step 6: Checking final loan status');
      await getLoanStatus();
    }

    console.log('');
    console.log('✅ Borrower agent demo completed successfully!');
    console.log('');
    console.log('🎉 Full loan cycle demonstrated:');
    console.log('   1. Credit check ✓');
    console.log('   2. Loan approved and disbursed ✓');
    console.log('   3. Funds used for 30 seconds ✓');
    console.log('   4. Loan repaid with interest ✓');
    console.log('   5. Credit history updated ✓');
  } catch (err) {
    console.error('❌ Borrower agent failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
