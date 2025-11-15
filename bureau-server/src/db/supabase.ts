import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface Agent {
  wallet_address: string;
  credit_score: number;
  total_borrowed: number;
  total_repaid: number;
  available_credit: number;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  wallet_address: string;
  amount: number;
  interest_rate: number;
  total_due: number;
  amount_repaid: number;
  status: 'active' | 'repaid' | 'defaulted';
  disbursed_at: string;
  due_date: string;
  repaid_at?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  loan_id: string;
  wallet_address: string;
  transaction_type: 'disbursement' | 'repayment';
  amount: number;
  locus_transaction_id?: string;
  memo?: string;
  created_at: string;
}

// Initialize Supabase client
let supabase: SupabaseClient | null = null;

export function initSupabase(): SupabaseClient {
  if (supabase) {
    return supabase;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return supabase;
}

// Agent operations
export async function getAgent(walletAddress: string): Promise<Agent | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }

  return data as Agent;
}

export async function createAgent(walletAddress: string, creditScore: number = 500): Promise<Agent> {
  const supabase = getSupabase();

  // Calculate available credit based on credit score
  let availableCredit = 0;
  if (creditScore >= 650) {
    availableCredit = 100; // Good credit
  } else if (creditScore >= 500) {
    availableCredit = 50; // Fair credit
  } else {
    availableCredit = 10; // Poor credit
  }

  const { data, error } = await supabase
    .from('agents')
    .insert({
      wallet_address: walletAddress,
      credit_score: creditScore,
      available_credit: availableCredit,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Agent;
}

export async function updateAgentBorrowing(
  walletAddress: string,
  borrowedAmount: number,
  repaidAmount: number = 0
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('agents')
    .update({
      total_borrowed: borrowedAmount,
      total_repaid: repaidAmount,
    })
    .eq('wallet_address', walletAddress);

  if (error) throw error;
}

// Loan operations
export async function createLoan(
  walletAddress: string,
  amount: number,
  interestRate: number = 0.05
): Promise<Loan> {
  const supabase = getSupabase();

  const totalDue = amount * (1 + interestRate);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // 30-day loan term

  const { data, error } = await supabase
    .from('loans')
    .insert({
      wallet_address: walletAddress,
      amount,
      interest_rate: interestRate,
      total_due: totalDue,
      amount_repaid: 0,
      status: 'active',
      due_date: dueDate.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Loan;
}

export async function getLoan(loanId: string): Promise<Loan | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data as Loan;
}

export async function getActiveLoans(walletAddress: string): Promise<Loan[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('wallet_address', walletAddress)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Loan[]) || [];
}

export async function getAllLoans(walletAddress: string): Promise<Loan[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Loan[]) || [];
}

export async function updateLoanRepayment(
  loanId: string,
  repaymentAmount: number
): Promise<Loan> {
  const supabase = getSupabase();

  // Get current loan
  const loan = await getLoan(loanId);
  if (!loan) {
    throw new Error(`Loan ${loanId} not found`);
  }

  const newAmountRepaid = loan.amount_repaid + repaymentAmount;
  const isFullyRepaid = newAmountRepaid >= loan.total_due;

  const { data, error } = await supabase
    .from('loans')
    .update({
      amount_repaid: newAmountRepaid,
      status: isFullyRepaid ? 'repaid' : 'active',
      repaid_at: isFullyRepaid ? new Date().toISOString() : null,
    })
    .eq('id', loanId)
    .select()
    .single();

  if (error) throw error;
  return data as Loan;
}

// Transaction operations
export async function createTransaction(
  loanId: string,
  walletAddress: string,
  type: 'disbursement' | 'repayment',
  amount: number,
  locusTransactionId?: string,
  memo?: string
): Promise<Transaction> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      loan_id: loanId,
      wallet_address: walletAddress,
      transaction_type: type,
      amount,
      locus_transaction_id: locusTransactionId,
      memo,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Transaction;
}

export async function getTransactionsByLoan(loanId: string): Promise<Transaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('loan_id', loanId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Transaction[]) || [];
}

export async function getTransactionsByWallet(walletAddress: string): Promise<Transaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Transaction[]) || [];
}
