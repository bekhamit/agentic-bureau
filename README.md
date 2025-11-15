# Agentic Bureau

> **An MCP server that enables AI agents to make autonomous payments**

Agentic Bureau is a Model Context Protocol (MCP) server that acts as a payment bureau for AI agents. Built on [Locus](https://paywithlocus.com), it enables autonomous agents to send USDC payments on the Base blockchain securely and programmatically.

## Features

- **Send Payments**: Send USDC to any wallet address via the Locus payment infrastructure
- **Payment Context**: Query budget status and whitelisted contacts
- **Secure**: Uses Locus API for payment execution with built-in policy controls
- **MCP Compatible**: Works with Claude Desktop and other MCP clients via stdio transport

## Architecture

```
MCP Client (Claude Desktop, etc.)
        ↓ stdio
Agentic Bureau MCP Server (this app)
        ↓ HTTP
Locus MCP Server (paywithlocus.com)
        ↓ Base Blockchain
USDC Transfer Executed
```

## Prerequisites

1. **Locus Account**: Sign up at [app.paywithlocus.com](https://app.paywithlocus.com)
2. **Locus API Key**: Get your API key from the Locus dashboard
3. **Anthropic API Key**: Required for Claude Agent SDK (get from [console.anthropic.com](https://console.anthropic.com))
4. **Funded Wallet**: Add USDC to your Locus wallet (Base Mainnet or Sepolia Testnet)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/bekhamit/agentic-bureau.git
cd agentic-bureau
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Add your API keys to `.env`:
```env
LOCUS_API_KEY=your_locus_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Running as MCP Server

### Option 1: Direct Execution

Run the MCP server directly:
```bash
npm run server
```

The server will start and communicate via stdio (standard input/output).

### Option 2: Configure with Claude Desktop

Add this server to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agentic-bureau": {
      "command": "node",
      "args": [
        "/absolute/path/to/agentic-bureau/node_modules/.bin/tsx",
        "/absolute/path/to/agentic-bureau/src/server.ts"
      ],
      "env": {
        "LOCUS_API_KEY": "your_locus_api_key_here",
        "ANTHROPIC_API_KEY": "your_anthropic_api_key_here"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/agentic-bureau` with the actual absolute path to this directory.

After adding the configuration:
1. Restart Claude Desktop
2. The Agentic Bureau server will be available as an MCP tool

## Available Tools

### 1. `send_payment`

Send USDC to a wallet address.

**Parameters:**
- `wallet_address` (string, required): Destination wallet address (must start with `0x`)
- `amount` (number, required): Amount of USDC to send (must be > 0)
- `memo` (string, optional): Payment description/memo

**Example usage in Claude Desktop:**
```
Send 0.01 USDC to wallet 0xe33e1171efeb28332aafc60cfa5b0e679f996235 with memo "Test payment"
```

### 2. `get_payment_context`

Get your Locus payment context including budget status and whitelisted contacts.

**Parameters:** None

**Example usage in Claude Desktop:**
```
What's my Locus payment context?
```

## Testing the Server

### Test with MCP Inspector

Use the official MCP Inspector tool to test your server:

```bash
npx @modelcontextprotocol/inspector tsx src/server.ts
```

This will open a web interface where you can:
- View available tools
- Test tool execution
- Inspect requests and responses

### Test with the Sample Client

You can also use the included test client (`index.ts`):

```bash
npm start
```

This runs a simple test that sends 0.01 USDC to a configured address.

## Project Structure

```
agentic-bureau/
├── src/
│   ├── server.ts          # MCP server implementation
│   └── locus-client.ts    # Locus payment client module
├── index.ts               # Test client (optional)
├── package.json
├── .env                   # Your API keys (gitignored)
├── .env.example           # Template for environment variables
├── LICENSE
└── README.md
```

## Security Considerations

- **API Keys**: Never commit your `.env` file to version control
- **Payment Limits**: Configure spending limits and policies in your Locus dashboard
- **Wallet Management**: Use Locus policy groups to control agent spending behavior
- **Audit Trail**: All transactions are logged and can be reviewed in your Locus dashboard

## Development

### Running in Development Mode

Watch mode for the test client:
```bash
npm run dev
```

### Type Checking

Run TypeScript type checking:
```bash
npm run type-check
```

### Building

Compile TypeScript to JavaScript:
```bash
npm run build
```

## Troubleshooting

### "LOCUS_API_KEY not found"
- Ensure your `.env` file exists and contains `LOCUS_API_KEY`
- If using Claude Desktop, ensure the API key is in the `claude_desktop_config.json` env section

### "Payment failed"
- Check that your Locus wallet has sufficient USDC balance
- Verify the recipient wallet address is valid (starts with `0x`, 42 characters)
- Check Locus dashboard for any policy restrictions

### "Connection refused" or MCP errors
- Ensure you're running the latest version of Claude Desktop
- Check that the absolute path in `claude_desktop_config.json` is correct
- Restart Claude Desktop after configuration changes

## Learn More

- [Locus Documentation](https://docs.paywithlocus.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/model-context-protocol)

## Support

For issues with:
- **Locus**: Contact founders@paywithlocus.com or join their Discord
- **MCP Protocol**: Visit [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **This Server**: Open an issue in this repository

## License

MIT
