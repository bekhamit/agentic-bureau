# Borrower Agent

AI agent that connects to the Agentic Bureau MCP server to request USDC payments.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
BORROWER_WALLET_ADDRESS=0xYourWalletAddressHere
BUREAU_MCP_URL=https://your-app.railway.app/mcp
```

**Environment Variables:**
- `ANTHROPIC_API_KEY`: Your Claude API key from [console.anthropic.com](https://console.anthropic.com)
- `BORROWER_WALLET_ADDRESS`: Your wallet address (must start with `0x`)
- `BUREAU_MCP_URL`: URL of the bureau MCP server
  - Local: `http://localhost:8080/mcp`
  - Production: `https://your-app.railway.app/mcp`

### 3. Run the Agent

```bash
npm start
```

## What It Does

The borrower agent will:

1. Connect to the bureau MCP server
2. Request payment context (budget status)
3. Request 0.01 USDC payment to your wallet
4. Display transaction details

## Example Output

```bash
🤖 Borrower Agent Starting...
📡 Connecting to bureau: https://your-app.railway.app/mcp
💳 Borrower wallet: 0xYourAddress...

📊 Requesting payment context from bureau...
✅ Budget Status: $0.99 USDC remaining

💰 Requesting 0.01 USDC payment from bureau...
✅ Payment sent successfully!
Transaction ID: 32691cc8-6ae6-411e-80e7-1641c9eb58da

✅ Borrower agent completed successfully!
```

## Multi-Laptop Demo Setup

Each borrower laptop needs:

1. Clone this folder only (or full repo)
2. Run `npm install`
3. Create `.env` with:
   - Your own `ANTHROPIC_API_KEY`
   - Your own `BORROWER_WALLET_ADDRESS`
   - Shared `BUREAU_MCP_URL` (from the server laptop)
4. Run `npm start`

## Customization

### Change Payment Amount

Edit `borrower-agent.ts`:

```typescript
// Request 0.05 USDC instead of 0.01
await requestPayment(0.05);
```

### Modify Prompts

The agent uses natural language prompts. Customize in `borrower-agent.ts`:

```typescript
prompt: `I need ${amount} USDC for groceries. Please send to ${BORROWER_WALLET}.`
```

## Troubleshooting

### "Connection failed"

- Verify `BUREAU_MCP_URL` is correct and accessible
- Test bureau health: `curl https://your-app.railway.app/health`
- Ensure bureau server is running

### "ANTHROPIC_API_KEY not found"

- Check `.env` file exists in this folder
- Verify API key is valid at [console.anthropic.com](https://console.anthropic.com)

### "BORROWER_WALLET_ADDRESS not found"

- Add your wallet address to `.env`
- Must start with `0x` and be valid Ethereum address

### "Payment failed"

- Bureau may be out of funds
- Check bureau's Locus account has USDC
- Verify wallet address is correct

## Architecture

```
Borrower Agent (this)
        ↓ HTTP
Bureau MCP Server
        ↓ HTTP
Locus MCP Server
        ↓ Base Blockchain
USDC → Your Wallet
```

## Support

- **Bureau Server**: See bureau-server README
- **Locus**: founders@paywithlocus.com
- **Issues**: [GitHub Issues](https://github.com/bekhamit/agentic-bureau/issues)
