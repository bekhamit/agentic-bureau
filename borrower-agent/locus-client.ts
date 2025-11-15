import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';

/**
 * Sends a USDC payment to a wallet address using the Locus MCP server
 * @param walletAddress - The destination wallet address (0x...)
 * @param amount - Amount of USDC to send
 * @param memo - Optional payment memo/description
 * @returns Promise that resolves with the payment result including transaction ID
 */
export async function sendPayment(
  walletAddress: string,
  amount: number,
  memo: string = 'Loan repayment via Locus'
): Promise<{result: string, transactionId: string | null}> {
  // Validate inputs
  if (!walletAddress || !walletAddress.startsWith('0x')) {
    throw new Error('Invalid wallet address. Must start with 0x');
  }
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  if (!process.env.LOCUS_API_KEY) {
    throw new Error('LOCUS_API_KEY not found in environment variables');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not found in environment variables');
  }

  // Configure MCP connection to Locus
  const mcpServers = {
    'locus': {
      type: 'http' as const,
      url: 'https://mcp.paywithlocus.com/mcp',
      headers: {
        'Authorization': `Bearer ${process.env.LOCUS_API_KEY}`
      }
    }
  };

  const options = {
    mcpServers,
    allowedTools: [
      'mcp__locus__*',
      'mcp__list_resources',
      'mcp__read_resource'
    ],
    apiKey: process.env.ANTHROPIC_API_KEY,
    canUseTool: async (toolName: string, input: Record<string, unknown>) => {
      if (toolName.startsWith('mcp__locus__')) {
        return {
          behavior: 'allow' as const,
          updatedInput: input
        };
      }
      return {
        behavior: 'deny' as const,
        message: 'Only Locus tools are allowed'
      };
    }
  };

  // Execute payment via Claude Agent SDK
  let paymentResult: any = null;
  let error: any = null;
  let transactionId: string | null = null;

  try {
    for await (const message of query({
      prompt: `Please send ${amount} USDC to the wallet address ${walletAddress} with the memo "${memo}". Make sure to return the transaction ID.`,
      options
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        paymentResult = (message as any).result;

        // Try to extract transaction ID from result
        const txIdMatch = paymentResult.match(/(?:transaction|tx)(?:\s+)?(?:id|ID)?(?:\s+)?(?:is|:)?\s+`?([a-f0-9-]+)`?/i);
        if (txIdMatch) {
          transactionId = txIdMatch[1];
        }
      } else if (message.type === 'result' && message.subtype.startsWith('error')) {
        error = (message as any).error;
      }
    }
  } catch (err) {
    throw new Error(`Failed to send payment: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (error) {
    throw new Error(`Payment failed: ${error}`);
  }

  if (!paymentResult) {
    throw new Error('Payment execution completed but no result was returned');
  }

  return {result: paymentResult, transactionId};
}
