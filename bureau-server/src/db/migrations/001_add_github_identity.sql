-- Migration: Add GitHub Identity Binding to Agents
-- Run this in your Supabase SQL Editor
-- This enables agents to bind GitHub accounts and earn income from bounties

-- Add GitHub identity columns to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS github_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS github_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS github_profile_url TEXT,
ADD COLUMN IF NOT EXISTS github_contribution_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS github_last_synced TIMESTAMP WITH TIME ZONE;

-- Create index for GitHub username lookups
CREATE INDEX IF NOT EXISTS idx_agents_github_username 
ON agents(github_username) WHERE github_username IS NOT NULL;

-- Add unique constraint to prevent duplicate GitHub accounts
ALTER TABLE agents
ADD CONSTRAINT unique_github_username UNIQUE (github_username);

-- Add comments for documentation
COMMENT ON COLUMN agents.github_username IS 'GitHub username bound to this agent wallet';
COMMENT ON COLUMN agents.github_verified IS 'Whether GitHub identity has been verified';
COMMENT ON COLUMN agents.github_profile_url IS 'Full GitHub profile URL';
COMMENT ON COLUMN agents.github_contribution_count IS 'Total GitHub contributions (cached)';
COMMENT ON COLUMN agents.github_last_synced IS 'Last time GitHub data was synced';

-- Create a view for agents with complete economic identity (wallet + GitHub)
CREATE OR REPLACE VIEW agents_with_identity AS
SELECT 
  a.*,
  CASE 
    WHEN a.github_username IS NOT NULL AND a.github_verified = TRUE 
    THEN TRUE 
    ELSE FALSE 
  END as has_complete_identity
FROM agents a;

COMMENT ON VIEW agents_with_identity IS 'Agents with wallet and GitHub identity information';
