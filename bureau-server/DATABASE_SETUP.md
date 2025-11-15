# Database Setup Guide

This guide will help you set up the Supabase database for the Credit Bureau MVP.

## Quick Start

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in project details:
   - **Name**: `credit-bureau-mvp` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the closest region to you
5. Click "Create new project" and wait for setup to complete

### 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 3. Configure Environment Variables

1. In the `bureau-server` directory, copy `.env.example` to `.env`:
   ```bash
   cd bureau-server
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   LOCUS_API_KEY=your_locus_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_KEY=eyJ...your_anon_key...
   ```

### 4. Create Database Tables

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the contents of `src/db/schema.sql` into the editor
4. Click "Run" to create the tables

You should see a success message confirming that the tables were created.

### 5. Seed Initial Data

1. In the SQL Editor, create a new query
2. Copy the contents of `src/db/seed.sql` into the editor
3. Click "Run" to insert the demo agents

You should see Agent A and Agent B in the results with their credit scores.

### 6. Verify Setup

Run this query in the SQL Editor to verify everything is set up correctly:

```sql
SELECT
  wallet_address,
  credit_score,
  available_credit,
  CASE
    WHEN credit_score >= 650 THEN 'Good Credit'
    WHEN credit_score >= 500 THEN 'Fair Credit'
    ELSE 'Poor Credit'
  END as credit_rating
FROM agents
ORDER BY credit_score DESC;
```

You should see:
- **Agent A**: Credit score 750 (Good Credit), $100 available credit
- **Agent B**: Credit score 300 (Poor Credit), $10 available credit

## Database Schema

### Tables

#### `agents`
Stores borrower profiles and credit scores.

| Column | Type | Description |
|--------|------|-------------|
| wallet_address | VARCHAR(42) | Primary key, borrower's wallet address |
| credit_score | INTEGER | Credit score (300-850) |
| total_borrowed | DECIMAL | Total amount borrowed |
| total_repaid | DECIMAL | Total amount repaid |
| available_credit | DECIMAL | Maximum borrowing limit |
| created_at | TIMESTAMP | When the agent was created |
| updated_at | TIMESTAMP | Last update time |

#### `loans`
Tracks all loan requests and their status.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| wallet_address | VARCHAR(42) | Foreign key to agents |
| amount | DECIMAL | Loan principal amount |
| interest_rate | DECIMAL | Interest rate (default 0.05 = 5%) |
| total_due | DECIMAL | Total amount due (principal + interest) |
| amount_repaid | DECIMAL | Amount repaid so far |
| status | VARCHAR(20) | 'active', 'repaid', or 'defaulted' |
| disbursed_at | TIMESTAMP | When loan was disbursed |
| due_date | TIMESTAMP | When loan is due (30 days from disbursement) |
| repaid_at | TIMESTAMP | When loan was fully repaid |
| created_at | TIMESTAMP | Record creation time |

#### `transactions`
Records all financial transactions (disbursements and repayments).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| loan_id | UUID | Foreign key to loans |
| wallet_address | VARCHAR(42) | Foreign key to agents |
| transaction_type | VARCHAR(20) | 'disbursement' or 'repayment' |
| amount | DECIMAL | Transaction amount |
| locus_transaction_id | VARCHAR(255) | Locus blockchain transaction ID |
| memo | TEXT | Transaction description |
| created_at | TIMESTAMP | Transaction timestamp |

## Credit Score Rules (MVP)

- **Good Credit (650+)**: Max loan $100
- **Fair Credit (500-649)**: Max loan $50
- **Poor Credit (<500)**: Max loan $10

## Demo Agents

### Agent A (Good Credit)
```
Wallet: 0xAgentA123456789012345678901234567890Ab
Credit Score: 750
Max Loan: $100 USDC
```

### Agent B (Bad Credit)
```
Wallet: 0xAgentB123456789012345678901234567890Bb
Credit Score: 300
Max Loan: $10 USDC
```

## Testing the System

### Test Agent A (Good Credit)
```bash
# In borrower-agent directory
export BORROWER_WALLET_ADDRESS=0xAgentA123456789012345678901234567890Ab
npm start
```

Agent A should be able to borrow up to $100 USDC.

### Test Agent B (Bad Credit)
```bash
# In borrower-agent directory
export BORROWER_WALLET_ADDRESS=0xAgentB123456789012345678901234567890Bb
npm start
```

Agent B should only be able to borrow up to $10 USDC. Requests for more will be denied.

## Troubleshooting

### Error: "Missing Supabase credentials"
- Make sure `SUPABASE_URL` and `SUPABASE_KEY` are set in your `.env` file
- Verify the values are correct (no extra spaces or quotes)

### Error: "relation 'agents' does not exist"
- You need to run the schema.sql file in Supabase SQL Editor
- Make sure you're in the correct Supabase project

### Agent not found in database
- Run the seed.sql file to create demo agents
- Or the system will auto-create an agent with default credit score (500) on first loan request

## Next Steps

After completing the database setup:

1. Start the bureau server:
   ```bash
   cd bureau-server
   npm start
   ```

2. In another terminal, run a borrower agent:
   ```bash
   cd borrower-agent
   export BORROWER_WALLET_ADDRESS=0xAgentA123456789012345678901234567890Ab
   npm start
   ```

3. Watch the agent request a loan, and check Supabase to see the loan records!

## Database Monitoring

You can monitor your database in real-time using Supabase:

1. **Table Editor**: View and edit data directly
2. **Database** → **Tables**: See table structure
3. **Logs**: Monitor queries and errors
4. **API Docs**: Auto-generated API documentation

## Production Considerations

For a production deployment, you should:

- [ ] Enable Row Level Security (RLS) in Supabase
- [ ] Use service role key for server-side operations
- [ ] Add proper indexes for performance
- [ ] Implement backup strategy
- [ ] Monitor database metrics
- [ ] Set up alerts for database issues

This MVP setup is perfect for hackathon demos but needs additional security for production use.
