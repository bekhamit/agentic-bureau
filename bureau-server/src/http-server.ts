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
import {
  initSupabase,
  getAgent,
  createAgent,
  createLoan,
  getLoan,
  getActiveLoans,
  getAllLoans,
  updateLoanRepayment,
  createTransaction,
  updateAgentBorrowing,
  bindGitHubToAgent,
  updateGitHubContributions as updateGitHubContributionsDB,
  unbindGitHubFromAgent,
  getAgentByGitHub,
} from './db/supabase.js';
import {
  verifyGitHubUsername,
  fetchGitHubContributions,
  getGitHubProfileUrl,
} from './github-client.js';

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
  {
    name: "request_loan",
    description: "Request a loan from the credit bureau. The bureau will check credit score and available_credit limit from the database, then approve/deny the loan request based on the agent's available credit.",
    inputSchema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "The borrower's wallet address (must start with 0x)",
        },
        amount: {
          type: "number",
          description: "Loan amount in USDC (must be greater than 0)",
        },
      },
      required: ["wallet_address", "amount"],
    },
  },
  {
    name: "get_repayment_instructions",
    description: "Get repayment instructions for a loan. Returns the bureau's wallet address and the amount due. Borrower should send payment to this address, then call repay_loan with the transaction ID.",
    inputSchema: {
      type: "object",
      properties: {
        loan_id: {
          type: "string",
          description: "The UUID of the loan to get repayment instructions for",
        },
      },
      required: ["loan_id"],
    },
  },
  {
    name: "repay_loan",
    description: "Confirm loan repayment after sending USDC to the bureau. Provide the Locus transaction ID as proof of payment. Bureau will verify and update loan status.",
    inputSchema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "The borrower's wallet address",
        },
        loan_id: {
          type: "string",
          description: "The UUID of the loan to repay",
        },
        locus_transaction_id: {
          type: "string",
          description: "The Locus transaction ID from the payment sent to the bureau",
        },
      },
      required: ["wallet_address", "loan_id", "locus_transaction_id"],
    },
  },
  {
    name: "get_loan_status",
    description: "Get loan status, credit score, and borrowing capacity for a wallet address. Shows all active loans and transaction history.",
    inputSchema: {
      type: "object",
      properties: {
        wallet_address: {
          type: "string",
          description: "The wallet address to check",
        },
      },
      required: ["wallet_address"],
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

      case "request_loan": {
        const walletAddress = args.wallet_address as string;
        const amount = args.amount as number;

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

        console.log(`Loan request: ${amount} USDC from ${walletAddress}`);

        // Get or create agent
        let agent = await getAgent(walletAddress);
        if (!agent) {
          console.log(`New agent detected, creating profile for ${walletAddress}`);
          agent = await createAgent(walletAddress);
        }

        // Check credit score and determine credit rating
        let creditRating = '';
        if (agent.credit_score >= 650) {
          creditRating = 'Good Credit';
        } else if (agent.credit_score >= 500) {
          creditRating = 'Fair Credit';
        } else {
          creditRating = 'Poor Credit';
        }

        // Use available_credit from database as the max loan amount
        const maxLoanAmount = agent.available_credit;

        // Check if requested amount exceeds credit limit
        if (amount > maxLoanAmount) {
          return {
            content: [
              {
                type: "text",
                text: `Loan Denied\n\nReason: Requested amount ($${amount}) exceeds credit limit\n\nYour Profile:\n- Credit Score: ${agent.credit_score}\n- Credit Rating: ${creditRating}\n- Max Loan Amount: $${maxLoanAmount}\n- Available Credit: $${agent.available_credit}\n\nPlease request a lower amount or work on improving your credit score.`,
              },
            ],
          };
        }

        // Check bureau's wallet balance
        const paymentContext = await getPaymentContext();
        // Parse the payment context to check balance (simplified for MVP)
        console.log('Bureau wallet context:', paymentContext);

        // Create loan record
        const loan = await createLoan(walletAddress, amount);

        // Send payment to borrower
        const memo = `Loan disbursement - Loan ID: ${loan.id}`;
        let paymentResult;
        try {
          paymentResult = await sendPayment(walletAddress, amount, memo);
        } catch (error) {
          // If payment fails, we should mark the loan as failed
          // For MVP, we'll just throw the error
          throw new Error(`Payment failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Create transaction record
        await createTransaction(
          loan.id,
          walletAddress,
          'disbursement',
          amount,
          undefined,
          memo
        );

        // Update agent's total borrowed
        await updateAgentBorrowing(
          walletAddress,
          agent.total_borrowed + amount,
          agent.total_repaid
        );

        return {
          content: [
            {
              type: "text",
              text: `Loan Approved! 🎉\n\nLoan Details:\n- Loan ID: ${loan.id}\n- Amount: $${amount} USDC\n- Interest Rate: ${(loan.interest_rate * 100).toFixed(2)}%\n- Total Due: $${loan.total_due.toFixed(2)} USDC\n- Due Date: ${new Date(loan.due_date).toLocaleDateString()}\n\nYour Credit Profile:\n- Credit Score: ${agent.credit_score}\n- Credit Rating: ${creditRating}\n\nPayment has been sent to ${walletAddress}\n\nPayment Result: ${paymentResult}`,
            },
          ],
        };
      }

      case "get_repayment_instructions": {
        const loanId = args.loan_id as string;

        // Validate input
        if (!loanId || typeof loanId !== 'string') {
          throw new Error("loan_id is required and must be a string");
        }

        console.log(`Getting repayment instructions for loan ${loanId}`);

        // Get the loan
        const loan = await getLoan(loanId);
        if (!loan) {
          throw new Error(`Loan ${loanId} not found`);
        }

        // Check if loan is already repaid
        if (loan.status === 'repaid') {
          throw new Error(`Loan ${loanId} is already fully repaid`);
        }

        // Calculate remaining balance
        const remainingBalance = loan.total_due - loan.amount_repaid;

        // Get bureau's wallet address from environment
        const bureauWalletAddress = process.env.BUREAU_WALLET_ADDRESS;
        if (!bureauWalletAddress) {
          throw new Error("Bureau wallet address not configured. Please set BUREAU_WALLET_ADDRESS in environment variables.");
        }

        return {
          content: [
            {
              type: "text",
              text: `Repayment Instructions for Loan ${loanId}\n\n💰 Amount Due: $${remainingBalance.toFixed(6)} USDC\n📍 Send To: ${bureauWalletAddress}\n\n📋 Instructions:\n1. Send exactly $${remainingBalance.toFixed(6)} USDC to the address above using your Locus wallet\n2. Save the Locus transaction ID from the payment\n3. Call repay_loan with your wallet address, loan ID, and the transaction ID\n\nOriginal Loan:\n- Principal: $${loan.amount.toFixed(2)} USDC\n- Interest Rate: ${(loan.interest_rate * 100).toFixed(2)}%\n- Total Due: $${loan.total_due.toFixed(6)} USDC\n- Already Paid: $${loan.amount_repaid.toFixed(6)} USDC\n- Remaining: $${remainingBalance.toFixed(6)} USDC`,
            },
          ],
        };
      }

      case "repay_loan": {
        const walletAddress = args.wallet_address as string;
        const loanId = args.loan_id as string;
        const locusTransactionId = args.locus_transaction_id as string;

        // Validate inputs
        if (!walletAddress || typeof walletAddress !== 'string') {
          throw new Error("wallet_address is required and must be a string");
        }
        if (!loanId || typeof loanId !== 'string') {
          throw new Error("loan_id is required and must be a string");
        }
        if (!locusTransactionId || typeof locusTransactionId !== 'string') {
          throw new Error("locus_transaction_id is required and must be a string");
        }

        console.log(`Confirming loan repayment for loan ${loanId} with transaction ${locusTransactionId}`);

        // Get the loan
        const loan = await getLoan(loanId);
        if (!loan) {
          throw new Error(`Loan ${loanId} not found`);
        }

        // Verify the loan belongs to this wallet
        if (loan.wallet_address !== walletAddress) {
          throw new Error(`Loan ${loanId} does not belong to wallet ${walletAddress}`);
        }

        // Check if loan is already repaid
        if (loan.status === 'repaid') {
          throw new Error(`Loan ${loanId} is already fully repaid`);
        }

        // Calculate remaining balance (full repayment)
        const remainingBalance = loan.total_due - loan.amount_repaid;
        const actualRepayment = remainingBalance;

        // Update loan with repayment
        const updatedLoan = await updateLoanRepayment(loanId, actualRepayment);

        // Create transaction record with Locus transaction ID
        await createTransaction(
          loanId,
          walletAddress,
          'repayment',
          actualRepayment,
          locusTransactionId,
          `Loan repayment - ${actualRepayment.toFixed(6)} USDC`
        );

        // Update agent's total repaid
        const agent = await getAgent(walletAddress);
        if (agent) {
          await updateAgentBorrowing(
            walletAddress,
            agent.total_borrowed,
            agent.total_repaid + actualRepayment
          );
        }

        const isFullyRepaid = updatedLoan.status === 'repaid';

        return {
          content: [
            {
              type: "text",
              text: `Repayment Received! ✅\n\nRepayment Details:\n- Loan ID: ${loanId}\n- Repayment Amount: $${actualRepayment.toFixed(2)} USDC\n- Remaining Balance: $${(updatedLoan.total_due - updatedLoan.amount_repaid).toFixed(2)} USDC\n- Total Repaid: $${updatedLoan.amount_repaid.toFixed(2)} USDC\n- Total Due: $${updatedLoan.total_due.toFixed(2)} USDC\n- Status: ${isFullyRepaid ? '✅ FULLY REPAID' : '🔄 ACTIVE'}\n\n${isFullyRepaid ? 'Congratulations! Your loan is fully repaid. Your credit score may improve!' : 'Keep making payments to fully repay your loan.'}`,
            },
          ],
        };
      }

      case "get_loan_status": {
        const walletAddress = args.wallet_address as string;

        // Validate input
        if (!walletAddress || typeof walletAddress !== 'string') {
          throw new Error("wallet_address is required and must be a string");
        }

        console.log(`Fetching loan status for ${walletAddress}`);

        // Get agent
        const agent = await getAgent(walletAddress);
        if (!agent) {
          return {
            content: [
              {
                type: "text",
                text: `No credit profile found for wallet ${walletAddress}\n\nThis wallet has not yet requested any loans from the bureau.`,
              },
            ],
          };
        }

        // Get all loans
        const allLoans = await getAllLoans(walletAddress);
        const activeLoans = allLoans.filter(l => l.status === 'active');

        // Calculate total active debt
        const totalActiveDebt = activeLoans.reduce((sum, loan) => {
          return sum + (loan.total_due - loan.amount_repaid);
        }, 0);

        // Format credit rating
        let creditRating = '';
        if (agent.credit_score >= 650) {
          creditRating = 'Good Credit';
        } else if (agent.credit_score >= 500) {
          creditRating = 'Fair Credit';
        } else {
          creditRating = 'Poor Credit';
        }

        // Use available_credit from database
        const maxLoanAmount = agent.available_credit;

        // Format loan details
        let loanDetails = '';
        if (activeLoans.length === 0) {
          loanDetails = '\n📋 Active Loans: None';
        } else {
          loanDetails = `\n📋 Active Loans (${activeLoans.length}):\n`;
          activeLoans.forEach(loan => {
            const remaining = loan.total_due - loan.amount_repaid;
            loanDetails += `\n  Loan ID: ${loan.id}\n`;
            loanDetails += `  Amount: $${loan.amount.toFixed(2)} USDC\n`;
            loanDetails += `  Total Due: $${loan.total_due.toFixed(2)} USDC\n`;
            loanDetails += `  Remaining: $${remaining.toFixed(2)} USDC\n`;
            loanDetails += `  Due Date: ${new Date(loan.due_date).toLocaleDateString()}\n`;
          });
        }

        return {
          content: [
            {
              type: "text",
              text: `Credit Profile for ${walletAddress}\n\n💳 Credit Information:\n- Credit Score: ${agent.credit_score}\n- Credit Rating: ${creditRating}\n- Max Loan Amount: $${maxLoanAmount}\n- Available Credit: $${agent.available_credit}\n\n📊 Borrowing History:\n- Total Borrowed: $${agent.total_borrowed.toFixed(2)} USDC\n- Total Repaid: $${agent.total_repaid.toFixed(2)} USDC\n- Total Active Debt: $${totalActiveDebt.toFixed(2)} USDC\n${loanDetails}`,
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

// Initialize Supabase on startup
try {
  initSupabase();
  console.log('✅ Supabase initialized successfully');
} catch (error) {
  console.error('⚠️  Warning: Supabase initialization failed:', error instanceof Error ? error.message : String(error));
  console.log('Server will start but database features will not be available.');
  console.log('Make sure SUPABASE_URL and SUPABASE_KEY are set in your environment.');
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agentic Bureau MCP Server running on port ${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Ready to accept connections from MCP clients');
  console.log('Using StreamableHTTPServerTransport (SDK recommended)');
});
