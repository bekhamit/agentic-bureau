# Agentic Bureau Server

MCP server that enables AI agents to make autonomous USDC payments via Locus.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
LOCUS_API_KEY=your_locus_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Get your API keys:
- **Locus**: [app.paywithlocus.com](https://app.paywithlocus.com)
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com)

### 3. Run the Server

**Local development:**
```bash
npm start
```

**Production (Railway):**
- Push to GitHub
- Connect repository to Railway
- Railway will automatically deploy using the `Procfile`

## Available Tools

The MCP server exposes two tools:

### `send_payment`
Send USDC to a wallet address.

**Parameters:**
- `wallet_address` (string, required): Destination wallet (starts with `0x`)
- `amount` (number, required): Amount of USDC to send
- `memo` (string, optional): Payment description

### `get_payment_context`
Get budget status and whitelisted contacts from Locus.

**Parameters:** None

## Endpoints

- **MCP**: `POST /mcp` - Main MCP protocol endpoint
- **Health**: `GET /health` - Health check endpoint

## Architecture

```
MCP Client (Borrower Agent)
        ↓ HTTP
Bureau Server (this)
        ↓ HTTP
Locus MCP Server
        ↓ Base Blockchain
USDC Transfer
```

## Deployment

### Railway (Recommended)

1. Push code to GitHub
2. Create new Railway project
3. Connect your GitHub repository
4. Add environment variables:
   - `LOCUS_API_KEY`
   - `ANTHROPIC_API_KEY`
5. Railway will detect the `Procfile` and deploy automatically

### Local Testing

```bash
npm start
```

Server will run on `http://localhost:8080`

## Security

- Never commit `.env` file
- Configure spending limits in Locus dashboard
- Use policy groups to control agent behavior
- All transactions are logged on Base blockchain

## Support

- **Locus**: founders@paywithlocus.com
- **Issues**: [GitHub Issues](https://github.com/bekhamit/agentic-bureau/issues)
