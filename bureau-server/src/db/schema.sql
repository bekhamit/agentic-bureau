-- Credit Bureau Database Schema for MVP

-- Agents/Borrowers table
-- Stores agent information and credit scores
CREATE TABLE IF NOT EXISTS agents (
  wallet_address VARCHAR(42) PRIMARY KEY,
  credit_score INTEGER DEFAULT 500 CHECK (credit_score >= 300 AND credit_score <= 850),
  total_borrowed DECIMAL(18, 6) DEFAULT 0,
  total_repaid DECIMAL(18, 6) DEFAULT 0,
  available_credit DECIMAL(18, 6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loans table
-- Tracks all loan requests and their status
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) REFERENCES agents(wallet_address) ON DELETE CASCADE,
  amount DECIMAL(18, 6) NOT NULL CHECK (amount > 0),
  interest_rate DECIMAL(5, 4) DEFAULT 0.05,
  total_due DECIMAL(18, 6) NOT NULL,
  amount_repaid DECIMAL(18, 6) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'defaulted')),
  disbursed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  repaid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
-- Records all financial transactions (disbursements and repayments)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) REFERENCES agents(wallet_address) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('disbursement', 'repayment')),
  amount DECIMAL(18, 6) NOT NULL CHECK (amount > 0),
  locus_transaction_id VARCHAR(255),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loans_wallet_address ON loans(wallet_address);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_address ON transactions(wallet_address);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
