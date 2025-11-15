import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';

async function main(): Promise<void> {
  try {
    console.log('🎯 Starting Locus Claude SDK application...\n');

    // 1. Configure MCP connection to Locus
    console.log('Configuring Locus MCP connection...');
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
        'mcp__locus__*',      // Allow all Locus tools
        'mcp__list_resources',
        'mcp__read_resource'
      ],
      apiKey: process.env.ANTHROPIC_API_KEY,
      // Auto-approve Locus tool usage
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

    console.log('✓ MCP configured\n');

    // 2. Run a query that uses MCP tools
    console.log('Running sample query...\n');
    console.log('─'.repeat(50));

    let mcpStatus: any = null;
    let finalResult: any = null;

    for await (const message of query({
      prompt: 'Please send 0.01 USDC to the wallet address 0xe33e1171efeb28332aafc60cfa5b0e679f996235 with the memo "Test payment from Claude"',
      options
    })) {
      if (message.type === 'system' && message.subtype === 'init') {
        // Check MCP connection status
        const mcpServersInfo = (message as any).mcp_servers;
        mcpStatus = mcpServersInfo?.find((s: any) => s.name === 'locus');
        if (mcpStatus?.status === 'connected') {
          console.log(`✓ Connected to Locus MCP server\n`);
        } else {
          console.warn(`⚠️  MCP connection issue\n`);
        }
      } else if (message.type === 'result' && message.subtype === 'success') {
        finalResult = (message as any).result;
      }
    }

    console.log('Response:', finalResult);
    console.log('─'.repeat(50));
    console.log('\n✓ Query completed successfully!');

    console.log('\n🚀 Your Locus application is working!');
    console.log('\nNext steps:');
    console.log('  • Modify the prompt in index.ts to use Locus tools');
    console.log('  • Try asking Claude to use specific Locus tools');
    console.log('  • Explore MCP resources and capabilities\n');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', errorMessage);
    console.error('\nPlease check:');
    console.error('  • Your .env file contains valid credentials');
    console.error('  • Your network connection is active');
    console.error('  • Your Locus and Anthropic API keys are correct\n');
    process.exit(1);
  }
}

main();
