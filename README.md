# Agentic Bureau

> **Payment infrastructure for AI agents - Built on Locus**

Agentic Bureau is a Model Context Protocol (MCP) server that acts as a payment bureau for AI agents. Built on [Locus](https://paywithlocus.com), it enables autonomous agents to send USDC payments on the Base blockchain securely and programmatically.

## Project Structure

This repository contains two separate applications:

```
agentic-bureau/
├── bureau-server/     # MCP server (deploy to Railway)
│   ├── src/
│   │   ├── http-server.ts
│   │   └── locus-client.ts
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── borrower-agent/    # Borrower agent (run on laptops)
│   ├── borrower-agent.ts
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
└── README.md         # This file
```

## Quick Start

### Bureau Server (Deploy Once)

The bureau server is the MCP server that handles payments via Locus.

**Deploy to Railway:**

1. Navigate to `bureau-server/` folder
2. Follow the [bureau-server/README.md](bureau-server/README.md)
3. Deploy to Railway with your Locus API key
4. Get your Railway URL

### Borrower Agent (Run on Each Laptop)

The borrower agent connects to the bureau server to request payments.

**Setup on each borrower laptop:**

1. Navigate to `borrower-agent/` folder
2. Follow the [borrower-agent/README.md](borrower-agent/README.md)
3. Configure with bureau server URL
4. Run to request payments

## Demo Setup (Multi-Laptop)

### Server Laptop (You)

1. Deploy bureau server to Railway (once)
2. Share the Railway URL with all borrowers

### Borrower Laptops (Demo Participants)

Each borrower:

1. Clones the repository
2. Opens `borrower-agent/` folder
3. Runs `npm install`
4. Creates `.env` with:
   ```env
   ANTHROPIC_API_KEY=their_own_api_key
   BORROWER_WALLET_ADDRESS=their_wallet_address
   BUREAU_MCP_URL=https://your-app.railway.app/mcp
   ```
5. Runs `npm start`

## Architecture

```
Borrower Agent (Laptop 1)  ─┐
Borrower Agent (Laptop 2)  ─┼──→  Bureau Server (Railway)
Borrower Agent (Laptop 3)  ─┘           ↓
                                  Locus MCP Server
                                        ↓
                                  Base Blockchain
                                        ↓
                                  USDC Transfers
```

## Features

- **Send Payments**: AI agents can send USDC to any wallet address
- **Payment Context**: Query budget status and whitelisted contacts
- **Secure**: Uses Locus API with built-in policy controls
- **Multi-Client**: Supports multiple borrower agents connecting simultaneously
- **Production-Ready**: Deployed on Railway with StreamableHTTPServerTransport

## Prerequisites

### Bureau Server

1. Locus Account: [app.paywithlocus.com](https://app.paywithlocus.com)
2. Locus API Key from dashboard
3. Anthropic API Key: [console.anthropic.com](https://console.anthropic.com)
4. Funded Locus wallet with USDC (Base Mainnet or Sepolia)

### Borrower Agent

1. Anthropic API Key: [console.anthropic.com](https://console.anthropic.com)
2. Personal wallet address (to receive payments)
3. Bureau server URL (Railway deployment)

## Technology Stack

- **MCP SDK**: `@modelcontextprotocol/sdk` - Model Context Protocol
- **Claude SDK**: `@anthropic-ai/claude-agent-sdk` - AI agent framework
- **Express**: HTTP server for MCP transport
- **Locus**: Payment infrastructure for AI agents
- **Base**: Ethereum L2 blockchain for USDC transfers
- **TypeScript**: Type-safe development

## Security Considerations

- **API Keys**: Never commit `.env` files to version control
- **Payment Limits**: Configure spending limits in Locus dashboard
- **Wallet Management**: Use Locus policy groups to control spending
- **Audit Trail**: All transactions are logged on Base blockchain
- **Multi-Client**: Each borrower uses their own Anthropic API key

## Development

### Bureau Server

```bash
cd bureau-server
npm install
npm start
```

### Borrower Agent

```bash
cd borrower-agent
npm install
npm start
```

## Deployment

### Bureau Server

**Railway** (recommended):
- Auto-deploys from GitHub
- Uses `Procfile` for configuration
- Set environment variables in Railway dashboard

### Borrower Agent

- No deployment needed
- Run locally on each demo laptop
- Each instance configured independently

## Learn More

- [Bureau Server Documentation](bureau-server/README.md)
- [Borrower Agent Documentation](borrower-agent/README.md)
- [Locus Documentation](https://docs.paywithlocus.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/model-context-protocol)

## Support

For issues with:
- **Bureau Server**: See [bureau-server/README.md](bureau-server/README.md)
- **Borrower Agent**: See [borrower-agent/README.md](borrower-agent/README.md)
- **Locus**: Contact founders@paywithlocus.com
- **This Project**: Open an issue on GitHub

## License

MIT
